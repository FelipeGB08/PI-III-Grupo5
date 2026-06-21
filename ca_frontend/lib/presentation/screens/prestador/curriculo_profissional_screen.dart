import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../providers/providers.dart';

class CurriculoProfissionalScreen extends ConsumerStatefulWidget {
  const CurriculoProfissionalScreen({super.key});

  @override
  ConsumerState<CurriculoProfissionalScreen> createState() =>
      _CurriculoProfissionalScreenState();
}

class _CurriculoProfissionalScreenState
    extends ConsumerState<CurriculoProfissionalScreen> {
  final _bioController = TextEditingController();
  final _anosController = TextEditingController();
  final _curriculoController = TextEditingController();
  final _portfolioController = TextEditingController();
  bool _preencheuCampos = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(curriculoProvider.notifier).carregar();
    });
  }

  @override
  void dispose() {
    _bioController.dispose();
    _anosController.dispose();
    _curriculoController.dispose();
    _portfolioController.dispose();
    super.dispose();
  }

  void _preencher(Map<String, dynamic> data) {
    if (_preencheuCampos) return;
    _bioController.text = data['biografia']?.toString() ?? '';
    _anosController.text = data['anos_experiencia']?.toString() ?? '0';
    _curriculoController.text = data['curriculo_texto']?.toString() ?? '';
    _portfolioController.text = data['portfolio_url']?.toString() ?? '';
    _preencheuCampos = true;
  }

  Future<void> _salvar() async {
    final bio = _bioController.text.trim();
    final anos = int.tryParse(_anosController.text.trim()) ?? 0;

    if (bio.length < 10) {
      _mostrarMensagem('Informe uma biografia com pelo menos 10 caracteres.');
      return;
    }

    final ok = await ref.read(curriculoProvider.notifier).salvar(
          biografia: bio,
          anosExperiencia: anos,
          curriculoTexto: _curriculoController.text.trim(),
          portfolioUrl: _portfolioController.text.trim(),
        );

    if (!mounted) return;
    if (ok) {
      _mostrarMensagem('Curriculo Vivo salvo com sucesso.');
    } else {
      final erro =
          ref.read(curriculoProvider).error ?? 'Nao foi possivel salvar.';
      _mostrarMensagem(erro);
    }
  }

  void _mostrarMensagem(String mensagem) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(mensagem)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(curriculoProvider);
    final theme = Theme.of(context);

    final data = state.data;
    if (data != null) {
      _preencher(data);
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Curriculo Vivo',
            style: theme.textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Mantenha sua apresentacao profissional pronta para os clientes.',
            style: theme.textTheme.bodyMedium?.copyWith(color: AppColors.muted),
          ),
          const SizedBox(height: 24),
          if (state.isLoading)
            const Center(child: CircularProgressIndicator())
          else ...[
            if (state.error != null && state.data == null) ...[
              Text(
                state.error!,
                style: const TextStyle(color: AppColors.statusRecusado),
              ),
              const SizedBox(height: 12),
            ],
            TextField(
              controller: _bioController,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Biografia profissional',
                hintText: 'Ex: Eletricista residencial com experiencia em...',
                prefixIcon: Icon(Icons.badge_outlined),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _anosController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Anos de experiencia',
                prefixIcon: Icon(Icons.timeline_outlined),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _curriculoController,
              maxLines: 5,
              decoration: const InputDecoration(
                labelText: 'Resumo do curriculo',
                hintText: 'Cursos, certificacoes, diferenciais e experiencias.',
                prefixIcon: Icon(Icons.description_outlined),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _portfolioController,
              keyboardType: TextInputType.url,
              decoration: const InputDecoration(
                labelText: 'Link de portfolio',
                hintText: 'https://...',
                prefixIcon: Icon(Icons.link_outlined),
              ),
            ),
            const SizedBox(height: 28),
            FilledButton.icon(
              onPressed: state.isSaving ? null : _salvar,
              icon: state.isSaving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.save_rounded),
              label: Text(state.isSaving ? 'Salvando...' : 'Salvar curriculo'),
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
