import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../domain/entities/prestador.dart';
import '../../providers/providers.dart';

class SolicitarServicoSheet extends ConsumerStatefulWidget {
  const SolicitarServicoSheet({super.key, required this.prestador});

  final Prestador prestador;

  static Future<void> show(BuildContext context, Prestador prestador) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => SolicitarServicoSheet(prestador: prestador),
    );
  }

  @override
  ConsumerState<SolicitarServicoSheet> createState() =>
      _SolicitarServicoSheetState();
}

class _SolicitarServicoSheetState extends ConsumerState<SolicitarServicoSheet> {
  final _descricaoController = TextEditingController();
  bool _enviando = false;

  @override
  void dispose() {
    _descricaoController.dispose();
    super.dispose();
  }

  Future<void> _enviar() async {
    if (_descricaoController.text.trim().isEmpty) return;
    setState(() => _enviando = true);
    try {
      await ref.read(chamadoRepositoryProvider).criar(
            profissionalId: widget.prestador.id,
            descricao: _descricaoController.text.trim(),
          );
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Chamado enviado! O prestador será notificado.'),
          ),
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
          Text(
            'Solicitar Serviço',
            style: theme.textTheme.headlineLarge?.copyWith(fontSize: 22),
          ),
          const SizedBox(height: 4),
          Text('Para ${widget.prestador.nome}',
              style: theme.textTheme.bodyMedium),
          const SizedBox(height: 20),
          TextField(
            controller: _descricaoController,
            maxLines: 4,
            decoration: const InputDecoration(
              hintText: 'Descreva o serviço necessário...',
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
                : const Text('Enviar Chamado'),
          ),
        ],
      ),
    );
  }
}
