import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_error_formatter.dart';
import '../../domain/entities/chamado.dart';
import '../../presentation/providers/providers.dart';

class AvaliarServicoScreen extends ConsumerStatefulWidget {
  const AvaliarServicoScreen({super.key, required this.chamado});

  final Chamado chamado;

  @override
  ConsumerState<AvaliarServicoScreen> createState() =>
      _AvaliarServicoScreenState();
}

class _AvaliarServicoScreenState extends ConsumerState<AvaliarServicoScreen> {
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
      final service = ref.read(avaliacoesServiceProvider);
      await service.criar(
        servicoId: widget.chamado.id,
        notaEstrelas: _nota,
        comentario: _comentarioController.text,
      );
      if (!mounted) return;
      Navigator.pop(context, true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Avaliação registrada com sucesso!')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(formatApiError(e)),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Avaliar Serviço')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              widget.chamado.descricao,
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Profissional: ${widget.chamado.profissionalNome ?? widget.chamado.profissionalId}',
              style: theme.textTheme.bodyMedium,
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
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Comentário',
                hintText: 'Conte como foi a experiência...',
                border: OutlineInputBorder(),
              ),
            ),
            const Spacer(),
            ElevatedButton(
              onPressed: _enviando ? null : _enviar,
              child: _enviando
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Enviar avaliação'),
            ),
          ],
        ),
      ),
    );
  }
}
