import 'dart:async';

import 'package:socket_io_client/socket_io_client.dart' as io;

import '../../core/config/api_config.dart';
import '../../domain/entities/chat_message.dart';
import '../datasources/local/token_storage.dart';
import '../models/chat_message_model.dart';

typedef ChatSessionRevokedCallback = void Function();

class ChatReadReceipt {
  const ChatReadReceipt({
    required this.servicoId,
    required this.leitorId,
    required this.ateMensagemId,
    required this.lidaEm,
  });

  final int servicoId;
  final int leitorId;
  final int ateMensagemId;
  final DateTime lidaEm;

  factory ChatReadReceipt.fromJson(Map<String, dynamic> json) {
    return ChatReadReceipt(
      servicoId: _parseInt(json['servico_id']),
      leitorId: _parseInt(json['leitor_id']),
      ateMensagemId: _parseInt(json['ate_mensagem_id']),
      lidaEm: DateTime.tryParse(json['lida_em']?.toString() ?? '') ??
          DateTime.now(),
    );
  }

  static int _parseInt(dynamic value) {
    if (value is int) return value;
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }
}

class ChatSocketService {
  ChatSocketService(
    this._storage, {
    this.onSessionRevoked,
  }) {
    _tokenSubscription = _storage.accessTokenChanges.listen(
      _onAccessTokenChanged,
    );
  }

  final TokenStorage _storage;
  final ChatSessionRevokedCallback? onSessionRevoked;
  final _messageController = StreamController<ChatMessage>.broadcast();
  final _readController = StreamController<ChatReadReceipt>.broadcast();
  final Set<int> _joinedServices = {};

  io.Socket? _socket;
  Future<void>? _connecting;
  StreamSubscription<String?>? _tokenSubscription;
  bool _disposed = false;

  Stream<ChatMessage> get messages => _messageController.stream;
  Stream<ChatReadReceipt> get readReceipts => _readController.stream;

  Future<void> connect() async {
    if (_disposed) {
      throw StateError('Servico de chat encerrado.');
    }
    if (_socket?.connected == true) return;

    final currentConnection = _connecting;
    if (currentConnection != null) return currentConnection;

    final token = _storage.getToken();
    if (token == null || token.isEmpty) {
      throw StateError('Sessao indisponivel para conectar ao chat.');
    }

    final connection = _openSocket(token);
    _connecting = connection;
    try {
      await connection;
    } finally {
      if (identical(_connecting, connection)) {
        _connecting = null;
      }
    }
  }

  Future<void> _openSocket(String token) async {
    await _closeSocket();

    final completer = Completer<void>();
    var connectedOnce = false;
    final socket = io.io(
      ApiConfig.baseUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .enableForceNew()
          .enableReconnection()
          .setReconnectionAttempts(5)
          .setAuth({'token': token})
          .build(),
    );
    _socket = socket;

    socket.onConnect((_) {
      if (!completer.isCompleted) {
        completer.complete();
      } else if (connectedOnce) {
        unawaited(_rejoinAll());
      }
      connectedOnce = true;
    });
    socket.onConnectError((error) {
      if (!completer.isCompleted) {
        completer.completeError(
          StateError(_socketError(error, 'Nao foi possivel conectar ao chat.')),
        );
      }
    });
    socket.onError((error) {
      if (!completer.isCompleted) {
        completer.completeError(
          StateError(_socketError(error, 'Erro na conexao do chat.')),
        );
      }
    });
    socket.on('chat:message', (data) {
      if (data is Map && !_messageController.isClosed) {
        _messageController.add(
          ChatMessageModel.fromJson(Map<String, dynamic>.from(data)),
        );
      }
    });
    socket.on('chat:read', (data) {
      if (data is Map && !_readController.isClosed) {
        _readController.add(
          ChatReadReceipt.fromJson(Map<String, dynamic>.from(data)),
        );
      }
    });
    socket.on('auth:revoked', (_) {
      unawaited(disconnect());
      onSessionRevoked?.call();
    });

    socket.connect();
    await completer.future.timeout(const Duration(seconds: 8));
  }

  Future<void> join(int servicoId) async {
    _joinedServices.add(servicoId);
    try {
      await connect();
      await _emitWithAck('chat:join', {'servico_id': servicoId});
    } catch (_) {
      _joinedServices.remove(servicoId);
      rethrow;
    }
  }

  Future<void> leave(int servicoId) async {
    _joinedServices.remove(servicoId);
    final socket = _socket;
    if (socket?.connected == true) {
      socket!.emit('chat:leave', {'servico_id': servicoId});
    }
  }

  Future<ChatMessage> send({
    required int servicoId,
    required String mensagem,
    required String clientId,
  }) async {
    await connect();
    final data = await _emitWithAck(
      'chat:send',
      {
        'servico_id': servicoId,
        'mensagem': mensagem,
        'client_id': clientId,
      },
    );
    final mensagemJson = data['mensagem'];
    if (mensagemJson is! Map) {
      throw StateError('Servidor nao confirmou a mensagem enviada.');
    }
    return ChatMessageModel.fromJson(
      Map<String, dynamic>.from(mensagemJson),
    );
  }

  Future<void> markRead(int servicoId) async {
    await connect();
    await _emitWithAck('chat:read', {'servico_id': servicoId});
  }

  Future<Map<String, dynamic>> _emitWithAck(
    String event,
    Map<String, dynamic> payload,
  ) {
    final socket = _socket;
    if (socket == null || socket.connected != true) {
      return Future.error(StateError('Socket de chat desconectado.'));
    }

    final completer = Completer<Map<String, dynamic>>();
    socket.emitWithAck(
      event,
      payload,
      ack: (data) {
        if (completer.isCompleted) return;
        if (data is! Map) {
          completer.completeError(
            StateError('Resposta invalida do servidor de chat.'),
          );
          return;
        }
        final result = Map<String, dynamic>.from(data);
        if (result['erro'] != null) {
          completer.completeError(StateError(result['erro'].toString()));
          return;
        }
        completer.complete(result);
      },
    );

    return completer.future.timeout(const Duration(seconds: 8));
  }

  Future<void> _rejoinAll() async {
    final services = List<int>.from(_joinedServices);
    for (final servicoId in services) {
      try {
        await _emitWithAck('chat:join', {'servico_id': servicoId});
      } catch (_) {
        // A reconexao permanece ativa. Uma nova tentativa sera feita quando a
        // tela voltar a entrar no chat ou o socket reconectar novamente.
      }
    }
  }

  void _onAccessTokenChanged(String? token) {
    if (_disposed) return;
    if (token == null || token.isEmpty) {
      unawaited(disconnect());
      return;
    }
    if (_socket != null) {
      unawaited(_reconnectWithCurrentToken());
    }
  }

  Future<void> _reconnectWithCurrentToken() async {
    try {
      await connect();
      // Se o socket anterior ainda estava conectado, connect() retorna sem
      // recria-lo. Fechamos explicitamente para trocar o token do handshake.
      await _closeSocket();
      await connect();
      await _rejoinAll();
    } catch (_) {
      // O fallback HTTP continua disponivel e a proxima acao tenta reconectar.
    }
  }

  String _socketError(dynamic error, String fallback) {
    if (error is Map && error['message'] != null) {
      return error['message'].toString();
    }
    final text = error?.toString().trim();
    return text == null || text.isEmpty ? fallback : text;
  }

  Future<void> _closeSocket() async {
    final socket = _socket;
    _socket = null;
    socket?.disconnect();
    socket?.dispose();
  }

  Future<void> disconnect() async {
    _joinedServices.clear();
    await _closeSocket();
  }

  void dispose() {
    _disposed = true;
    unawaited(_tokenSubscription?.cancel());
    unawaited(disconnect());
    unawaited(_messageController.close());
    unawaited(_readController.close());
  }
}
