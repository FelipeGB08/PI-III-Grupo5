import 'dart:async';

import 'package:socket_io_client/socket_io_client.dart' as io;

import '../../core/config/api_config.dart';
import '../../domain/entities/chat_message.dart';
import '../datasources/local/token_storage.dart';
import '../models/chat_message_model.dart';

class ChatSocketService {
  ChatSocketService(this._storage);

  final TokenStorage _storage;
  final _controller = StreamController<ChatMessage>.broadcast();
  io.Socket? _socket;

  Stream<ChatMessage> get messages => _controller.stream;

  Future<void> connect() async {
    if (_socket?.connected == true) return;

    final token = _storage.getToken();
    if (token == null || token.isEmpty) return;

    final socket = io.io(
      ApiConfig.baseUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .setAuth({'token': token})
          .build(),
    );

    socket.on('chat:message', (data) {
      if (data is Map) {
        _controller.add(
          ChatMessageModel.fromJson(Map<String, dynamic>.from(data)),
        );
      }
    });

    socket.connect();
    _socket = socket;
  }

  Future<void> join(int servicoId) async {
    await connect();
    _socket?.emit('chat:join', {'servico_id': servicoId});
  }

  Future<void> send({
    required int servicoId,
    required String mensagem,
  }) async {
    await connect();
    _socket?.emit('chat:send', {
      'servico_id': servicoId,
      'mensagem': mensagem,
    });
  }

  void dispose() {
    _socket?.dispose();
    _socket = null;
  }
}
