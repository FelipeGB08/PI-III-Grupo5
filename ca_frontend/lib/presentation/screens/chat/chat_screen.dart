import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error_formatter.dart';
import '../../../core/theme/adaptive_colors.dart';
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
    _subscription?.cancel();
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _initChat() async {
    try {
      final api = ref.read(apiServiceProvider);
      final socket = ref.read(chatSocketServiceProvider);
      final historico = await api.listarMensagensChat(widget.chamado.id);
      await socket.join(widget.chamado.id);

      _subscription = socket.messages.listen((mensagem) {
        if (mensagem.servicoId != widget.chamado.id) return;
        if (_mensagens.any((item) => item.id == mensagem.id)) return;
        setState(() => _mensagens.add(mensagem));
        _scrollToBottom();
      });

      if (!mounted) return;
      setState(() {
        _mensagens
          ..clear()
          ..addAll(historico);
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

    setState(() => _sending = true);
    _controller.clear();

    try {
      await ref.read(chatSocketServiceProvider).send(
            servicoId: widget.chamado.id,
            mensagem: texto,
          );
    } catch (_) {
      try {
        final mensagem = await ref.read(apiServiceProvider).enviarMensagemChat(
              chamadoId: widget.chamado.id,
              mensagem: texto,
            );
        if (!mounted) return;
        setState(() => _mensagens.add(mensagem));
        _scrollToBottom();
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(formatApiError(e))),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
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
                    child: TextField(
                      controller: _controller,
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
    return Align(
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
            Text(
              _formatHora(mensagem.criadoEm),
              style: TextStyle(
                color: (minha ? context.appOnBrand : context.appTextSecondary)
                    .withValues(alpha: 0.72),
                fontSize: 10,
              ),
            ),
          ],
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
