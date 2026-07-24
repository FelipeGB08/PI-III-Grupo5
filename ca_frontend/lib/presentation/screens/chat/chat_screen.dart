import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error_formatter.dart';
import '../../../core/theme/adaptive_colors.dart';
import '../../../data/services/chat_socket_service.dart';
import '../../../domain/entities/chamado.dart';
import '../../../domain/entities/chat_message.dart';
import '../../../domain/entities/user.dart';
import '../../providers/providers.dart';

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key, required this.chamado});

  final Chamado chamado;

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  final List<ChatMessage> _mensagens = [];
  StreamSubscription<ChatMessage>? _subscription;
  StreamSubscription<ChatReadReceipt>? _readSubscription;
  bool _loading = true;
  bool _sending = false;

  int? get _usuarioId => ref.read(authStateProvider).user?.id;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _initChat());
  }

  @override
  void dispose() {
    unawaited(_subscription?.cancel());
    unawaited(_readSubscription?.cancel());
    unawaited(
      ref.read(chatSocketServiceProvider).leave(widget.chamado.id),
    );
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _initChat() async {
    try {
      final api = ref.read(apiServiceProvider);
      final socket = ref.read(chatSocketServiceProvider);

      _subscription = socket.messages.listen((mensagem) {
        if (mensagem.servicoId != widget.chamado.id) return;
        if (!mounted) return;
        setState(() => _mergeMessages([mensagem]));
        if (mensagem.remetenteId != _usuarioId) {
          unawaited(socket.markRead(widget.chamado.id));
        }
        _scrollToBottom();
      });
      _readSubscription = socket.readReceipts.listen((leitura) {
        if (leitura.servicoId != widget.chamado.id ||
            leitura.leitorId == _usuarioId ||
            !mounted) {
          return;
        }

        setState(() {
          for (var index = 0; index < _mensagens.length; index++) {
            final mensagem = _mensagens[index];
            if (mensagem.remetenteId == _usuarioId &&
                mensagem.id <= leitura.ateMensagemId &&
                mensagem.lidaEm == null) {
              _mensagens[index] = mensagem.copyWith(lidaEm: leitura.lidaEm);
            }
          }
        });
      });

      await socket.join(widget.chamado.id);
      final historico = await api.listarMensagensChat(widget.chamado.id);

      if (!mounted) return;
      setState(() {
        _mergeMessages(historico);
        _loading = false;
      });
      _scrollToBottom();
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(formatApiError(e))),
      );
    }
  }

  Future<void> _send() async {
    final texto = _controller.text.trim();
    if (texto.isEmpty || _sending) return;

    _controller.clear();
    await _enviarTexto(texto, _newClientId(), restoreDraftOnFailure: true);
  }

  Future<void> _enviarTexto(
    String texto,
    String clientId, {
    required bool restoreDraftOnFailure,
  }) async {
    if (_sending) return;
    setState(() => _sending = true);

    try {
      final mensagem = await ref.read(chatSocketServiceProvider).send(
            servicoId: widget.chamado.id,
            mensagem: texto,
            clientId: clientId,
          );
      if (!mounted) return;
      setState(() => _mergeMessages([mensagem]));
      _scrollToBottom();
    } catch (_) {
      try {
        final mensagem = await ref.read(apiServiceProvider).enviarMensagemChat(
              chamadoId: widget.chamado.id,
              mensagem: texto,
              clientId: clientId,
            );
        if (!mounted) return;
        setState(() => _mergeMessages([mensagem]));
        _scrollToBottom();
      } catch (e) {
        if (!mounted) return;
        if (restoreDraftOnFailure && _controller.text.trim().isEmpty) {
          _controller.text = texto;
          _controller.selection = TextSelection.collapsed(
            offset: _controller.text.length,
          );
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(formatApiError(e)),
            action: SnackBarAction(
              label: 'Tentar novamente',
              onPressed: () => unawaited(
                _enviarTexto(
                  texto,
                  clientId,
                  restoreDraftOnFailure: false,
                ),
              ),
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _mergeMessages(Iterable<ChatMessage> novasMensagens) {
    final porId = <int, ChatMessage>{
      for (final mensagem in _mensagens) mensagem.id: mensagem,
    };
    for (final mensagem in novasMensagens) {
      final atual = porId[mensagem.id];
      porId[mensagem.id] = atual != null && mensagem.lidaEm == null
          ? mensagem.copyWith(lidaEm: atual.lidaEm)
          : mensagem;
    }
    _mensagens
      ..clear()
      ..addAll(porId.values)
      ..sort((a, b) => a.id.compareTo(b.id));
  }

  String _newClientId() {
    final random = Random.secure();
    final sufixo = List.generate(
      3,
      (_) => random.nextInt(0x100000000).toRadixString(16).padLeft(8, '0'),
    ).join();
    return '${DateTime.now().microsecondsSinceEpoch}-$sufixo';
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final otherName =
        ref.watch(authStateProvider).user?.tipo.isPrestador == true
            ? (widget.chamado.cidadaoNome ?? 'Cliente')
            : (widget.chamado.profissionalNome ?? 'Profissional');

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Chat do Chamado'),
            Text(
              otherName,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _mensagens.isEmpty
                    ? const _EmptyChat()
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                        itemCount: _mensagens.length,
                        itemBuilder: (context, index) {
                          final mensagem = _mensagens[index];
                          final minha = mensagem.remetenteId == _usuarioId;
                          return _MessageBubble(
                            mensagem: mensagem,
                            minha: minha,
                          );
                        },
                      ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
              child: Row(
                children: [
                  Expanded(
                    child: Semantics(
                      label: 'Mensagem para $otherName',
                      hint: 'Digite a mensagem e use o botao Enviar mensagem',
                      textField: true,
                      child: TextField(
                        controller: _controller,
                        onSubmitted: _sending ? null : (_) => _send(),
                        minLines: 1,
                        maxLines: 4,
                        textInputAction: TextInputAction.newline,
                        decoration: InputDecoration(
                          labelText: 'Mensagem',
                          hintText: 'Digite uma mensagem...',
                          filled: true,
                          fillColor: context.appCard,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(18),
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _sending ? null : _send,
                    tooltip: _sending ? 'Enviando mensagem' : 'Enviar mensagem',
                    icon: _sending
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.send_rounded),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({
    required this.mensagem,
    required this.minha,
  });

  final ChatMessage mensagem;
  final bool minha;

  @override
  Widget build(BuildContext context) {
    final remetente =
        minha ? 'Voce' : (mensagem.remetenteNome ?? 'Profissional');
    final status =
        minha ? (mensagem.lidaEm == null ? 'enviada' : 'lida') : null;
    return Semantics(
      label:
          'Mensagem de $remetente, ${mensagem.mensagem}, enviada as ${_formatHora(mensagem.criadoEm)}${status == null ? '' : ', $status'}',
      child: ExcludeSemantics(
        child: Align(
          alignment: minha ? Alignment.centerRight : Alignment.centerLeft,
          child: Container(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.78,
            ),
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: minha ? context.appBrand : context.appCard,
              borderRadius: BorderRadius.circular(16).copyWith(
                bottomRight: minha ? const Radius.circular(4) : null,
                bottomLeft: minha ? null : const Radius.circular(4),
              ),
              border: minha ? null : Border.all(color: context.appBorder),
            ),
            child: Column(
              crossAxisAlignment:
                  minha ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                if (!minha && mensagem.remetenteNome?.isNotEmpty == true) ...[
                  Text(
                    mensagem.remetenteNome!,
                    style: TextStyle(
                      color: context.appBrand,
                      fontWeight: FontWeight.w800,
                      fontSize: 11,
                    ),
                  ),
                  const SizedBox(height: 4),
                ],
                Text(
                  mensagem.mensagem,
                  style: TextStyle(
                    color: minha ? context.appOnBrand : context.appTextPrimary,
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 5),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      _formatHora(mensagem.criadoEm),
                      style: TextStyle(
                        color: (minha
                                ? context.appOnBrand
                                : context.appTextSecondary)
                            .withValues(alpha: 0.72),
                        fontSize: 10,
                      ),
                    ),
                    if (minha) ...[
                      const SizedBox(width: 4),
                      Icon(
                        mensagem.lidaEm == null
                            ? Icons.check_rounded
                            : Icons.done_all_rounded,
                        size: 14,
                        color: context.appOnBrand.withValues(alpha: 0.82),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _formatHora(DateTime date) {
    return '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }
}

class _EmptyChat extends StatelessWidget {
  const _EmptyChat();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Text(
          'Nenhuma mensagem ainda. Combine detalhes do atendimento por aqui.',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      ),
    );
  }
}
