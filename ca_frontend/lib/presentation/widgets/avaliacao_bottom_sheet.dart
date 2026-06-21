import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/chamado.dart';
import '../providers/providers.dart';

class AvaliacaoBottomSheet extends ConsumerStatefulWidget {
  const AvaliacaoBottomSheet({super.key, required this.chamado});

  final Chamado chamado;

  static Future<void> show(BuildContext context, Chamado chamado) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AvaliacaoBottomSheet(chamado: chamado),
    );
  }

  @override
  ConsumerState<AvaliacaoBottomSheet> createState() =>
      _AvaliacaoBottomSheetState();
}

class _AvaliacaoBottomSheetState extends ConsumerState<AvaliacaoBottomSheet> {
  int _nota = 5;
  final _comentarioController = TextEditingController();
  bool _enviando = false;

  @override
  void dispose() {
    _comentarioController.dispose();
    super.dispose();
  }

  Future<void> _enviar() async {
    setState(() => _enviando = true);
    try {
      await ref.read(avaliacaoRepositoryProvider).criar(
            solicitacaoId: widget.chamado.id,
            profissionalId: widget.chamado.profissionalId,
            nota: _nota,
            comentario: _comentarioController.text,
          );
      ref.read(chamadosProvider.notifier).clearPendingReview();
      await ref.read(chamadosProvider.notifier).carregar();
      if (mounted) Navigator.pop(context);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Avaliação enviada ao Currículo Vivo!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: BoxDecoration(
        color: theme.scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: theme.dividerColor,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Avalie o serviço',
            style: theme.textTheme.headlineLarge?.copyWith(fontSize: 22),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'Sua opinião alimenta o Currículo Vivo do prestador.',
            style: theme.textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (i) {
              final star = i + 1;
              return IconButton(
                onPressed: () => setState(() => _nota = star),
                icon: Icon(
                  star <= _nota
                      ? Icons.star_rounded
                      : Icons.star_outline_rounded,
                  color: Colors.amber,
                  size: 36,
                ),
              );
            }),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _comentarioController,
            maxLines: 3,
            decoration: const InputDecoration(
              hintText: 'Conte como foi a experiência...',
            ),
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: _enviando ? null : _enviar,
            child: _enviando
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Enviar Avaliação'),
          ),
        ],
      ),
    );
  }
}
