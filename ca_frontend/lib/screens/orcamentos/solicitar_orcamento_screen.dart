import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/network/api_error_formatter.dart';
import '../../domain/entities/prestador.dart';
import '../../presentation/providers/providers.dart';

class SolicitarOrcamentoScreen extends ConsumerStatefulWidget {
  const SolicitarOrcamentoScreen({super.key, required this.prestador});

  final Prestador prestador;

  @override
  ConsumerState<SolicitarOrcamentoScreen> createState() =>
      _SolicitarOrcamentoScreenState();
}

class _SolicitarOrcamentoScreenState
    extends ConsumerState<SolicitarOrcamentoScreen> {
  final _descricaoController = TextEditingController();
  final _picker = ImagePicker();
  File? _foto;
  bool _enviando = false;

  @override
  void dispose() {
    _descricaoController.dispose();
    super.dispose();
  }

  Future<void> _selecionarFoto() async {
    final imagem = await _picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1920,
      imageQuality: 85,
    );
    if (imagem != null) {
      setState(() => _foto = File(imagem.path));
    }
  }

  Future<void> _enviar() async {
    final descricao = _descricaoController.text.trim();
    if (descricao.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Descreva o problema para solicitar orçamento.')),
      );
      return;
    }

    setState(() => _enviando = true);
    try {
      final service = ref.read(servicosServiceProvider);
      await service.solicitarOrcamento(
        profId: widget.prestador.id,
        descricao: descricao,
        foto: _foto,
      );
      if (!mounted) return;
      Navigator.pop(context, true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Orçamento enviado com sucesso!'),
          backgroundColor: Color(0xFF10B981),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(formatApiError(e)), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Solicitar Orçamento')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              widget.prestador.nome,
              style: theme.textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              widget.prestador.cidade,
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _descricaoController,
              maxLines: 5,
              decoration: const InputDecoration(
                labelText: 'Descrição do problema',
                hintText: 'Ex: vazamento no banheiro, troca de tomadas...',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 20),
            OutlinedButton.icon(
              onPressed: _selecionarFoto,
              icon: const Icon(Icons.photo_camera_rounded),
              label: Text(
                  _foto == null ? 'Anexar foto do problema' : 'Trocar foto'),
            ),
            if (_foto != null) ...[
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.file(_foto!, height: 180, fit: BoxFit.cover),
              ),
            ],
            const SizedBox(height: 28),
            ElevatedButton(
              onPressed: _enviando ? null : _enviar,
              child: _enviando
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Enviar solicitação'),
            ),
          ],
        ),
      ),
    );
  }
}
