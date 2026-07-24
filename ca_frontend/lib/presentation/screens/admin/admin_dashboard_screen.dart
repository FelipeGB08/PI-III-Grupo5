import 'package:flutter/services.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../providers/providers.dart';

class AdminDashboardScreen extends ConsumerStatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  ConsumerState<AdminDashboardScreen> createState() =>
      _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends ConsumerState<AdminDashboardScreen> {
  final _categoriaController = TextEditingController();
  final _buscaUsuariosController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(adminProvider.notifier).carregar();
    });
  }

  @override
  void dispose() {
    _categoriaController.dispose();
    _buscaUsuariosController.dispose();
    super.dispose();
  }

  Future<void> _buscarUsuarios({String? perfilTipo, int page = 1}) async {
    await ref.read(adminProvider.notifier).carregarUsuarios(
          page: page,
          perfilTipo:
              perfilTipo ?? ref.read(adminProvider).filtroPerfilUsuarios,
          busca: _buscaUsuariosController.text.trim(),
        );
    if (!mounted) return;
    final erro = ref.read(adminProvider).error;
    if (erro != null) _mostrar(erro);
  }

  Future<void> _alternarStatusUsuario(Map<String, dynamic> usuario) async {
    final id = int.tryParse('${usuario['id']}') ?? 0;
    if (id == 0 || usuario['excluido_em'] != null) return;
    final estaAtivo = usuario['ativo'] == true;
    final acao = estaAtivo ? 'inativar' : 'ativar';
    final confirmou = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('${acao[0].toUpperCase()}${acao.substring(1)} conta'),
        content: Text(
          'Deseja $acao a conta de ${usuario['nome'] ?? 'usuario'}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(acao[0].toUpperCase() + acao.substring(1)),
          ),
        ],
      ),
    );
    if (confirmou != true) return;

    final ok = await ref
        .read(adminProvider.notifier)
        .atualizarStatusUsuario(id, !estaAtivo);
    if (!mounted) return;
    _mostrar(ok
        ? 'Conta ${estaAtivo ? 'inativada' : 'ativada'} com sucesso.'
        : ref.read(adminProvider).error ??
            'Nao foi possivel atualizar a conta.');
  }

  Future<void> _exportarCsv() async {
    try {
      final csv =
          await ref.read(apiServiceProvider).exportarRelatorioAdminCsv();
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Relatorio CSV gerado'),
          content: SizedBox(
            width: 520,
            child: SingleChildScrollView(
              child: SelectableText(
                csv,
                semanticsLabel: 'Conteudo do relatorio administrativo em CSV',
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Fechar'),
            ),
            FilledButton.icon(
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: csv));
                if (ctx.mounted) {
                  Navigator.pop(ctx);
                  _mostrar('CSV copiado para a area de transferencia.');
                }
              },
              icon: const Icon(Icons.content_copy_outlined),
              label: const Text('Copiar CSV'),
            ),
          ],
        ),
      );
    } catch (_) {
      if (mounted) _mostrar('Nao foi possivel gerar o relatorio CSV.');
    }
  }

  Future<void> _criarCategoria() async {
    final nome = _categoriaController.text.trim();
    if (nome.length < 2) return;
    final ok = await ref.read(adminProvider.notifier).criarCategoria(nome);
    if (!mounted) return;
    if (ok) {
      _categoriaController.clear();
      _mostrar('Categoria criada.');
    } else {
      _mostrar(ref.read(adminProvider).error ?? 'Nao foi possivel criar.');
    }
  }

  Future<void> _deletarCategoria(int id) async {
    final ok = await ref.read(adminProvider.notifier).deletarCategoria(id);
    if (!mounted) return;
    _mostrar(ok
        ? 'Categoria removida.'
        : ref.read(adminProvider).error ?? 'Nao foi possivel remover.');
  }

  Future<void> _editarCategoria(Map<String, dynamic> categoria) async {
    final id = int.tryParse('${categoria['id']}') ?? 0;
    if (id == 0) return;

    final controller = TextEditingController(
      text: categoria['nome_servico']?.toString() ?? '',
    );
    final nome = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Editar categoria'),
        content: TextField(
          controller: controller,
          autofocus: true,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(
            labelText: 'Nome da categoria',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Voltar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('Salvar'),
          ),
        ],
      ),
    );
    controller.dispose();

    if (nome == null || nome.length < 2) return;
    final ok = await ref.read(adminProvider.notifier).atualizarCategoria(
          id,
          nome,
        );
    if (!mounted) return;
    _mostrar(ok
        ? 'Categoria atualizada.'
        : ref.read(adminProvider).error ?? 'Nao foi possivel atualizar.');
  }

  Future<void> _aprovarVerificacao(Map<String, dynamic> verificacao) async {
    final id = int.tryParse('${verificacao['perfil_id']}') ?? 0;
    if (id == 0) return;

    final confirmou = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Aprovar verificacao'),
        content: Text(
          'Confirmar o selo de profissional verificado para ${verificacao['nome'] ?? 'este profissional'}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Aprovar'),
          ),
        ],
      ),
    );
    if (confirmou != true) return;

    final ok = await ref.read(adminProvider.notifier).aprovarVerificacao(id);
    if (!mounted) return;
    _mostrar(ok
        ? 'Verificacao aprovada.'
        : ref.read(adminProvider).error ?? 'Nao foi possivel aprovar.');
  }

  Future<void> _rejeitarVerificacao(Map<String, dynamic> verificacao) async {
    final id = int.tryParse('${verificacao['perfil_id']}') ?? 0;
    if (id == 0) return;

    final controller = TextEditingController();
    final motivo = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Rejeitar verificacao'),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLines: 3,
          maxLength: 1000,
          decoration: const InputDecoration(
            labelText: 'Motivo da rejeicao',
            hintText: 'Ex: Documento ilegivel. Envie uma foto nitida.',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          FilledButton.tonal(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('Rejeitar'),
          ),
        ],
      ),
    );
    controller.dispose();

    if (motivo == null || motivo.length < 5) {
      if (mounted && motivo != null) {
        _mostrar('Informe um motivo com pelo menos 5 caracteres.');
      }
      return;
    }

    final ok =
        await ref.read(adminProvider.notifier).rejeitarVerificacao(id, motivo);
    if (!mounted) return;
    _mostrar(ok
        ? 'Verificacao rejeitada.'
        : ref.read(adminProvider).error ?? 'Nao foi possivel rejeitar.');
  }

  void _verDocumento(Map<String, dynamic> verificacao) {
    final id = int.tryParse('${verificacao['perfil_id']}') ?? 0;
    if (id == 0) return;
    final documento =
        ref.read(apiServiceProvider).baixarDocumentoVerificacaoAdmin(id);

    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Documento de ${verificacao['nome'] ?? 'profissional'}'),
        content: SizedBox(
          width: 420,
          child: FutureBuilder(
            future: documento,
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const SizedBox(
                  height: 180,
                  child: Center(child: CircularProgressIndicator()),
                );
              }
              if (snapshot.hasError || !snapshot.hasData) {
                return const Text(
                    'Nao foi possivel carregar o documento privado.');
              }
              return InteractiveViewer(
                child: Image.memory(
                  snapshot.data!,
                  semanticLabel: 'Documento de verificacao do profissional',
                  fit: BoxFit.contain,
                ),
              );
            },
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Fechar'),
          ),
        ],
      ),
    );
  }

  Future<void> _tratarDenuncia(Map<String, dynamic> item) async {
    final id = int.tryParse('${item['id']}') ?? 0;
    if (id == 0) return;

    Map<String, dynamic> denuncia;
    try {
      denuncia = await ref.read(apiServiceProvider).buscarDenunciaAdmin(id);
    } catch (_) {
      if (mounted) {
        _mostrar('Nao foi possivel carregar o contexto da denuncia.');
      }
      return;
    }
    if (!mounted) return;

    final resolucaoController = TextEditingController(
      text: denuncia['resolucao_admin']?.toString() ?? '',
    );
    var statusSelecionado = denuncia['status']?.toString() ?? 'aberta';
    final servico = (denuncia['servico'] as Map?) ?? const {};
    final atualizacao = await showDialog<({String status, String resolucao})>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text('Denuncia #$id'),
          content: SizedBox(
            width: 460,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    denuncia['descricao']?.toString() ?? '',
                    style: Theme.of(ctx).textTheme.bodyLarge,
                  ),
                  const SizedBox(height: 12),
                  Text('Motivo: ${_motivoDenuncia(denuncia['motivo'])}'),
                  Text('Denunciante: ${denuncia['denunciante_nome'] ?? '-'}'),
                  const Divider(height: 28),
                  Text(
                    'Chamado #${servico['id'] ?? '-'} · ${servico['servico_nome'] ?? 'Servico'}',
                    style: Theme.of(ctx).textTheme.titleSmall,
                  ),
                  Text('Status do chamado: ${servico['status'] ?? '-'}'),
                  if (servico['descricao']?.toString().isNotEmpty == true) ...[
                    const SizedBox(height: 6),
                    Text(servico['descricao'].toString()),
                  ],
                  const SizedBox(height: 18),
                  DropdownButtonFormField<String>(
                    initialValue: statusSelecionado,
                    decoration:
                        const InputDecoration(labelText: 'Status da denuncia'),
                    items: const [
                      DropdownMenuItem(value: 'aberta', child: Text('Aberta')),
                      DropdownMenuItem(
                          value: 'em_analise', child: Text('Em analise')),
                      DropdownMenuItem(
                          value: 'resolvida', child: Text('Resolvida')),
                      DropdownMenuItem(
                          value: 'arquivada', child: Text('Arquivada')),
                    ],
                    onChanged: (valor) {
                      if (valor != null) {
                        setDialogState(() => statusSelecionado = valor);
                      }
                    },
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: resolucaoController,
                    minLines: 3,
                    maxLines: 5,
                    maxLength: 4000,
                    decoration: InputDecoration(
                      labelText: statusSelecionado == 'resolvida'
                          ? 'Resolucao administrativa (obrigatoria)'
                          : 'Resolucao administrativa (opcional)',
                    ),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(
                ctx,
                (
                  status: statusSelecionado,
                  resolucao: resolucaoController.text.trim()
                ),
              ),
              child: const Text('Salvar tratamento'),
            ),
          ],
        ),
      ),
    );
    resolucaoController.dispose();
    if (atualizacao == null) return;
    if (atualizacao.status == 'resolvida' && atualizacao.resolucao.length < 5) {
      _mostrar('Informe a resolucao com pelo menos 5 caracteres.');
      return;
    }

    final ok = await ref.read(adminProvider.notifier).atualizarDenuncia(
          denunciaId: id,
          status: atualizacao.status,
          resolucaoAdmin:
              atualizacao.resolucao.isEmpty ? null : atualizacao.resolucao,
        );
    if (!mounted) return;
    _mostrar(ok
        ? 'Denuncia atualizada.'
        : ref.read(adminProvider).error ??
            'Nao foi possivel atualizar a denuncia.');
  }

  String _motivoDenuncia(Object? motivo) => switch (motivo?.toString()) {
        'servico_nao_realizado' => 'Servico nao realizado',
        'cobranca_indevida' => 'Cobranca indevida',
        'comportamento_inadequado' => 'Comportamento inadequado',
        _ => 'Outro problema',
      };

  void _mostrar(String mensagem) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(mensagem)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(adminProvider);
    final theme = Theme.of(context);
    final relatorio = state.relatorio ?? const {};
    final demandas = (relatorio['demandas_por_municipio'] as List?) ?? const [];
    final status = (relatorio['resumo_status'] as List?) ?? const [];
    final prestadores =
        (relatorio['prestadores_mais_bem_avaliados'] as List?) ?? const [];
    final categorias =
        (relatorio['chamados_por_categoria'] as List?) ?? const [];
    final cancelamentos =
        (relatorio['taxa_cancelamento_por_prestador'] as List?) ?? const [];

    return RefreshIndicator(
      onRefresh: () => ref.read(adminProvider.notifier).carregar(),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
        children: [
          Text(
            'Painel Admin',
            style: theme.textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Usuarios, moderacao e indicadores para demonstracao academica.',
            style: theme.textTheme.bodyMedium?.copyWith(color: AppColors.muted),
          ),
          const SizedBox(height: 24),
          if (state.isLoading)
            const Center(child: CircularProgressIndicator())
          else ...[
            if (state.error != null) ...[
              Text(
                state.error!,
                style: const TextStyle(color: AppColors.statusRecusado),
              ),
              const SizedBox(height: 12),
            ],
            _Section(
              title: 'Resumo por status',
              child: status.isEmpty
                  ? const Text('Sem dados ainda.')
                  : Column(
                      children: status.map((item) {
                        final map = item as Map;
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(map['status']?.toString() ?? '-'),
                          trailing: Text(map['quantidade']?.toString() ?? '0'),
                        );
                      }).toList(),
                    ),
            ),
            _Section(
              title: 'Demandas por municipio',
              child: demandas.isEmpty
                  ? const Text('Sem dados ainda.')
                  : Column(
                      children: demandas.map((item) {
                        final map = item as Map;
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(map['municipio']?.toString() ?? '-'),
                          trailing:
                              Text(map['total_demandas']?.toString() ?? '0'),
                        );
                      }).toList(),
                    ),
            ),
            _Section(
              title: 'Indicadores de moderacao',
              child: Wrap(
                spacing: 12,
                runSpacing: 8,
                children: [
                  Chip(
                    avatar: const Icon(Icons.badge_outlined, size: 18),
                    label: Text(
                      'Verificacoes pendentes: ${relatorio['verificacoes_pendentes'] ?? 0}',
                    ),
                  ),
                  Chip(
                    avatar: const Icon(Icons.flag_outlined, size: 18),
                    label: Text(
                      'Denuncias abertas: ${relatorio['denuncias_abertas'] ?? 0}',
                    ),
                  ),
                ],
              ),
            ),
            _Section(
              title: 'Prestadores mais bem avaliados',
              child: prestadores.isEmpty
                  ? const Text('Sem avaliacoes suficientes ainda.')
                  : Column(
                      children: prestadores.map((item) {
                        final map = item as Map;
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: const Icon(Icons.star_outline_rounded),
                          title:
                              Text(map['profissional_nome']?.toString() ?? '-'),
                          trailing: Text(
                            '${map['nota_media'] ?? 0} (${map['total_avaliacoes'] ?? 0})',
                          ),
                        );
                      }).toList(),
                    ),
            ),
            _Section(
              title: 'Chamados por categoria',
              child: categorias.isEmpty
                  ? const Text('Sem dados ainda.')
                  : Column(
                      children: categorias.map((item) {
                        final map = item as Map;
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(map['categoria']?.toString() ?? '-'),
                          trailing:
                              Text(map['total_chamados']?.toString() ?? '0'),
                        );
                      }).toList(),
                    ),
            ),
            _Section(
              title: 'Taxa de cancelamento por prestador',
              child: cancelamentos.isEmpty
                  ? const Text('Sem chamados para calcular a taxa.')
                  : Column(
                      children: cancelamentos.map((item) {
                        final map = item as Map;
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          title:
                              Text(map['profissional_nome']?.toString() ?? '-'),
                          subtitle: Text(
                            '${map['total_cancelados'] ?? 0} de ${map['total_chamados'] ?? 0} chamados cancelados',
                          ),
                          trailing: Text('${map['taxa_cancelamento'] ?? 0}%'),
                        );
                      }).toList(),
                    ),
            ),
            _Section(
              title: 'Exportar relatorio',
              child: Align(
                alignment: Alignment.centerLeft,
                child: FilledButton.icon(
                  onPressed: _exportarCsv,
                  icon: const Icon(Icons.file_download_outlined),
                  label: const Text('Gerar CSV'),
                ),
              ),
            ),
            _Section(
              title: 'Usuarios (${state.usuariosTotal})',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    controller: _buscaUsuariosController,
                    textInputAction: TextInputAction.search,
                    onSubmitted: (_) => _buscarUsuarios(),
                    decoration: InputDecoration(
                      labelText: 'Buscar por nome ou e-mail',
                      suffixIcon: IconButton(
                        tooltip: 'Buscar usuarios',
                        onPressed: _buscarUsuarios,
                        icon: const Icon(Icons.search),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String?>(
                    initialValue: state.filtroPerfilUsuarios,
                    decoration:
                        const InputDecoration(labelText: 'Filtrar por perfil'),
                    items: const [
                      DropdownMenuItem<String?>(
                        value: null,
                        child: Text('Todos os perfis'),
                      ),
                      DropdownMenuItem(
                          value: 'cidadao', child: Text('Cidadaos')),
                      DropdownMenuItem(
                        value: 'profissional',
                        child: Text('Profissionais'),
                      ),
                      DropdownMenuItem(value: 'admin', child: Text('Admins')),
                    ],
                    onChanged: (perfil) => _buscarUsuarios(perfilTipo: perfil),
                  ),
                  const SizedBox(height: 8),
                  if (state.usuarios.isEmpty)
                    const Text('Nenhum usuario encontrado.')
                  else
                    ...state.usuarios.map((usuario) {
                      final excluido = usuario['excluido_em'] != null;
                      final ativo = usuario['ativo'] == true;
                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: Icon(
                          excluido
                              ? Icons.person_off_outlined
                              : (ativo
                                  ? Icons.person_outline_rounded
                                  : Icons.person_off_outlined),
                        ),
                        title: Text(usuario['nome']?.toString() ?? '-'),
                        subtitle: Text(
                          '${usuario['email'] ?? '-'} Â· ${usuario['perfil_tipo'] ?? '-'}',
                        ),
                        trailing: Switch(
                          value: ativo,
                          onChanged: excluido
                              ? null
                              : (_) => _alternarStatusUsuario(usuario),
                        ),
                      );
                    }),
                  if (state.usuariosHasMore)
                    TextButton(
                      onPressed: () => _buscarUsuarios(
                        page: state.usuariosPage + 1,
                      ),
                      child: const Text('Proxima pagina'),
                    ),
                ],
              ),
            ),
            _Section(
              title: 'Verificacoes pendentes',
              child: state.verificacoesPendentes.isEmpty
                  ? const Text('Nenhum documento aguardando revisao.')
                  : Column(
                      children: state.verificacoesPendentes.map((verificacao) {
                        final enviadoEm =
                            verificacao['enviado_em']?.toString() ?? '-';
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: const Icon(Icons.badge_outlined),
                          title: Text(verificacao['nome']?.toString() ?? '-'),
                          subtitle: Text(
                            '${verificacao['cidade_amauc'] ?? '-'} · Enviado: $enviadoEm',
                          ),
                          trailing: Wrap(
                            spacing: 2,
                            children: [
                              IconButton(
                                tooltip: 'Ver documento privado',
                                onPressed: () => _verDocumento(verificacao),
                                icon: const Icon(Icons.visibility_outlined),
                              ),
                              IconButton(
                                tooltip: 'Aprovar verificacao',
                                onPressed: () =>
                                    _aprovarVerificacao(verificacao),
                                icon: const Icon(
                                  Icons.check_circle_outline_rounded,
                                  color: AppColors.statusConcluido,
                                ),
                              ),
                              IconButton(
                                tooltip: 'Rejeitar verificacao',
                                onPressed: () =>
                                    _rejeitarVerificacao(verificacao),
                                icon: const Icon(
                                  Icons.cancel_outlined,
                                  color: AppColors.statusRecusado,
                                ),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
            ),
            _Section(
              title: 'Denuncias e disputas',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  DropdownButtonFormField<String?>(
                    initialValue: state.filtroDenuncias,
                    decoration:
                        const InputDecoration(labelText: 'Filtrar por status'),
                    items: const [
                      DropdownMenuItem<String?>(
                          value: null, child: Text('Todas')),
                      DropdownMenuItem(value: 'aberta', child: Text('Abertas')),
                      DropdownMenuItem(
                          value: 'em_analise', child: Text('Em analise')),
                      DropdownMenuItem(
                          value: 'resolvida', child: Text('Resolvidas')),
                      DropdownMenuItem(
                          value: 'arquivada', child: Text('Arquivadas')),
                    ],
                    onChanged: (valor) => ref
                        .read(adminProvider.notifier)
                        .carregar(filtroDenuncias: valor),
                  ),
                  const SizedBox(height: 8),
                  if (state.denuncias.isEmpty)
                    const Text('Nenhuma denuncia encontrada.')
                  else
                    ...state.denuncias.map((denuncia) {
                      final id = denuncia['id']?.toString() ?? '-';
                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: const Icon(
                          Icons.flag_outlined,
                          color: AppColors.statusRecusado,
                        ),
                        title: Text(
                            'Denuncia #$id · ${_motivoDenuncia(denuncia['motivo'])}'),
                        subtitle: Text(
                          '${denuncia['denunciante_nome'] ?? '-'} · Chamado #${denuncia['servico_solicitado_id'] ?? '-'}',
                        ),
                        trailing: TextButton(
                          onPressed: () => _tratarDenuncia(denuncia),
                          child:
                              Text(denuncia['status']?.toString() ?? 'aberta'),
                        ),
                      );
                    }),
                ],
              ),
            ),
            _Section(
              title: 'Categorias',
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _categoriaController,
                          decoration: const InputDecoration(
                            labelText: 'Nova categoria',
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      IconButton.filled(
                        onPressed: _criarCategoria,
                        icon: const Icon(Icons.add_rounded),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ...state.categorias.map((categoria) {
                    final id = int.tryParse('${categoria['id']}') ?? 0;
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(categoria['nome_servico']?.toString() ?? '-'),
                      trailing: Wrap(
                        spacing: 4,
                        children: [
                          IconButton(
                            tooltip: 'Editar',
                            onPressed: id == 0
                                ? null
                                : () => _editarCategoria(categoria),
                            icon: const Icon(Icons.edit_outlined),
                          ),
                          IconButton(
                            tooltip: 'Remover',
                            onPressed:
                                id == 0 ? null : () => _deletarCategoria(id),
                            icon: const Icon(Icons.delete_outline_rounded),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}
