import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/amauc_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../providers/providers.dart';
import 'prestador_profile_screen.dart';
import 'verificacao_profissional_screen.dart';

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
  final _portfolioFotosController = TextEditingController();
  final _certificacoesController = TextEditingController();
  final _taxaController = TextEditingController();
  final Set<String> _cidadesAtendidas = {};
  bool _atendeRural = false;
  bool _atendeEmergencia = false;
  bool _possuiVeiculo = false;
  bool _preencheuCampos = false;
  bool _abrindoPrevia = false;

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
    _portfolioFotosController.dispose();
    _certificacoesController.dispose();
    _taxaController.dispose();
    super.dispose();
  }

  void _preencher(Map<String, dynamic> data) {
    if (_preencheuCampos) return;
    _bioController.text = data['biografia']?.toString() ?? '';
    _anosController.text = data['anos_experiencia']?.toString() ?? '0';
    _curriculoController.text = data['curriculo_texto']?.toString() ?? '';
    _portfolioController.text = data['portfolio_url']?.toString() ?? '';
    _portfolioFotosController.text = _joinList(data['portfolio_fotos']);
    _certificacoesController.text = _joinList(data['certificacoes']);
    _taxaController.text = data['taxa_deslocamento']?.toString() ?? '';
    _atendeRural = data['atende_rural'] == true;
    _atendeEmergencia = data['atende_emergencia'] == true;
    _possuiVeiculo = data['possui_veiculo'] == true;
    final cidades = data['cidades_atendidas'];
    if (cidades is List) {
      _cidadesAtendidas
        ..clear()
        ..addAll(cidades.map((cidade) => cidade.toString()));
    }
    _preencheuCampos = true;
  }

  Future<void> _salvar() async {
    final bio = _bioController.text.trim();
    final anos = int.tryParse(_anosController.text.trim()) ?? 0;
    final taxa = double.tryParse(
      _taxaController.text.trim().replaceAll(',', '.'),
    );

    if (bio.length < 10) {
      _mostrarMensagem('Informe uma biografia com pelo menos 10 caracteres.');
      return;
    }

    final ok = await ref.read(curriculoProvider.notifier).salvar(
          biografia: bio,
          anosExperiencia: anos,
          curriculoTexto: _curriculoController.text.trim(),
          portfolioUrl: _portfolioController.text.trim(),
          portfolioFotos: _splitLines(_portfolioFotosController.text),
          certificacoes: _splitLines(_certificacoesController.text),
          cidadesAtendidas: _cidadesAtendidas.toList(),
          atendeRural: _atendeRural,
          atendeEmergencia: _atendeEmergencia,
          possuiVeiculo: _possuiVeiculo,
          taxaDeslocamento: taxa,
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

  Future<void> _abrirPreviaParaCliente() async {
    final profissionalId = ref.read(authStateProvider).user?.id;
    if (profissionalId == null) {
      _mostrarMensagem('Sua sessão não está disponível. Entre novamente.');
      return;
    }

    setState(() => _abrindoPrevia = true);
    try {
      final prestador = await ref
          .read(apiServiceProvider)
          .buscarPrestadorPorId(profissionalId);
      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => PrestadorProfileScreen(
            prestador: prestador,
            previewMode: true,
          ),
        ),
      );
    } catch (error) {
      if (mounted) {
        _mostrarMensagem('Não foi possível abrir a prévia: $error');
      }
    } finally {
      if (mounted) setState(() => _abrindoPrevia = false);
    }
  }

  List<String> _splitLines(String value) {
    return value
        .split(RegExp(r'\r?\n|,'))
        .map((item) => item.trim())
        .where((item) => item.isNotEmpty)
        .toSet()
        .toList();
  }

  String _joinList(dynamic value) {
    if (value is List) {
      return value.map((item) => item.toString()).join('\n');
    }
    return '';
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
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => const VerificacaoProfissionalScreen(),
                ),
              );
            },
            icon: const Icon(Icons.verified_user_outlined),
            label: const Text('Verificacao do perfil'),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: state.isLoading || _abrindoPrevia
                ? null
                : _abrirPreviaParaCliente,
            icon: const Icon(Icons.visibility_outlined),
            label: Text(
              _abrindoPrevia
                  ? 'Abrindo prévia...'
                  : 'Ver perfil como o cliente vê',
            ),
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
            const SizedBox(height: 16),
            TextField(
              controller: _portfolioFotosController,
              keyboardType: TextInputType.url,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Galeria de trabalhos',
                hintText: 'Cole uma URL de imagem por linha',
                prefixIcon: Icon(Icons.photo_library_outlined),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _certificacoesController,
              keyboardType: TextInputType.url,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Certificacoes e diplomas',
                hintText: 'Cole uma URL de certificado por linha',
                prefixIcon: Icon(Icons.workspace_premium_outlined),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Atendimento regional AMAUC',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Marque as cidades onde voce atende e destaque diferenciais importantes para clientes do interior.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.muted,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: AmaucConstants.cidades.map((cidade) {
                final selected = _cidadesAtendidas.contains(cidade);
                return FilterChip(
                  label: Text(cidade),
                  selected: selected,
                  onSelected: (value) {
                    setState(() {
                      if (value) {
                        _cidadesAtendidas.add(cidade);
                      } else {
                        _cidadesAtendidas.remove(cidade);
                      }
                    });
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
            SwitchListTile(
              value: _atendeRural,
              onChanged: (value) => setState(() => _atendeRural = value),
              title: const Text('Atende interior / area rural'),
              secondary: const Icon(Icons.agriculture_outlined),
            ),
            SwitchListTile(
              value: _atendeEmergencia,
              onChanged: (value) => setState(() => _atendeEmergencia = value),
              title: const Text('Atende emergencia'),
              secondary: const Icon(Icons.flash_on_outlined),
            ),
            SwitchListTile(
              value: _possuiVeiculo,
              onChanged: (value) => setState(() => _possuiVeiculo = value),
              title: const Text('Possui veiculo proprio'),
              secondary: const Icon(Icons.local_shipping_outlined),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _taxaController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Taxa de deslocamento base',
                hintText: 'Ex: 40,00',
                prefixIcon: Icon(Icons.route_outlined),
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
