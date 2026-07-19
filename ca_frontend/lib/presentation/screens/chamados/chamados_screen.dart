import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../domain/entities/chamado.dart';
import '../../../domain/entities/user.dart';
import '../../providers/providers.dart';
import '../../widgets/avaliacao_bottom_sheet.dart';
import '../../widgets/chamado_card.dart';
import '../../widgets/shimmer_loading.dart';
import '../agendamentos/agendamento_detalhes_screen.dart';

class ChamadosScreen extends ConsumerStatefulWidget {
  const ChamadosScreen({super.key});

  @override
  ConsumerState<ChamadosScreen> createState() => _ChamadosScreenState();
}

class _ChamadosScreenState extends ConsumerState<ChamadosScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(chamadosProvider.notifier).carregar();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(chamadosProvider);
    final user = ref.watch(authStateProvider).user;
    final isPrestador = user?.tipo.isPrestador ?? false;

    ref.listen<ChamadosState>(chamadosProvider, (prev, next) {
      if (next.pendingReview != null &&
          next.pendingReview != prev?.pendingReview) {
        AvaliacaoBottomSheet.show(context, next.pendingReview!);
      }
    });

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
          child: Text(
            'Agendamentos',
            style: Theme.of(context)
                .textTheme
                .headlineLarge
                ?.copyWith(fontSize: 24),
          ),
        ),
        const SizedBox(height: 16),
        TabBar(
          controller: _tabController,
          labelStyle:
              const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
          tabs: const [
            Tab(text: 'Proximos'),
            Tab(text: 'Confirmados'),
            Tab(text: 'Historico'),
          ],
        ),
        Expanded(
          child: state.isLoading
              ? const PrestadorListShimmer()
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _ChamadosList(
                      chamados: state.chamados
                          .where((c) =>
                              c.status == ChamadoStatus.pendente ||
                              c.status == ChamadoStatus.propostaValor ||
                              c.status == ChamadoStatus.remarcacaoSolicitada)
                          .toList(),
                      isPrestador: isPrestador,
                      hasMore: state.hasMore,
                      isLoadingMore: state.isLoadingMore,
                    ),
                    _ChamadosList(
                      chamados:
                          _filter(state.chamados, ChamadoStatus.emAndamento),
                      isPrestador: isPrestador,
                      showConcluir: true,
                      hasMore: state.hasMore,
                      isLoadingMore: state.isLoadingMore,
                    ),
                    _ChamadosList(
                      chamados: state.chamados
                          .where((c) =>
                              c.status == ChamadoStatus.concluido ||
                              c.status == ChamadoStatus.recusado ||
                              c.status == ChamadoStatus.cancelado)
                          .toList(),
                      isPrestador: isPrestador,
                      showAvaliar: !isPrestador,
                      hasMore: state.hasMore,
                      isLoadingMore: state.isLoadingMore,
                    ),
                  ],
                ),
        ),
      ],
    );
  }

  List<Chamado> _filter(List<Chamado> list, ChamadoStatus status) =>
      list.where((c) => c.status == status).toList();
}

class _ChamadosList extends ConsumerWidget {
  const _ChamadosList({
    required this.chamados,
    required this.isPrestador,
    required this.hasMore,
    required this.isLoadingMore,
    this.showConcluir = false,
    this.showAvaliar = false,
  });

  final List<Chamado> chamados;
  final bool isPrestador;
  final bool hasMore;
  final bool isLoadingMore;
  final bool showConcluir;
  final bool showAvaliar;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (chamados.isEmpty && !hasMore) {
      return Center(
        child: Text(
          'Nenhum chamado aqui',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(chamadosProvider.notifier).carregar(),
      child: ListView.builder(
        padding: const EdgeInsets.all(20),
        itemCount: chamados.length + (hasMore ? 1 : 0),
        itemBuilder: (_, i) {
          if (i == chamados.length) {
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Center(
                child: isLoadingMore
                    ? const CircularProgressIndicator()
                    : OutlinedButton.icon(
                        onPressed: () =>
                            ref.read(chamadosProvider.notifier).carregarMais(),
                        icon: const Icon(Icons.expand_more_rounded),
                        label: const Text('Carregar mais'),
                      ),
              ),
            );
          }
          final c = chamados[i];
          return ChamadoCard(
            chamado: c,
            isPrestador: isPrestador,
            onAceitar: () => ref.read(chamadosProvider.notifier).aceitar(c.id),
            onRecusar: () => ref.read(chamadosProvider.notifier).recusar(c.id),
            onConcluir: showConcluir
                ? () => ref.read(chamadosProvider.notifier).concluir(c.id)
                : null,
            onCancelar: !isPrestador && c.status == ChamadoStatus.pendente
                ? () => _cancelarSolicitacao(context, ref, c)
                : null,
            onRemarcar: isPrestador && c.status == ChamadoStatus.emAndamento
                ? () => _solicitarRemarcacao(context, ref, c)
                : null,
            onProporValor: isPrestador && c.status == ChamadoStatus.pendente
                ? () => _proporValor(context, ref, c)
                : null,
            onAceitarPropostaValor:
                !isPrestador && c.status == ChamadoStatus.propostaValor
                    ? () => ref
                        .read(chamadosProvider.notifier)
                        .aceitarPropostaValor(c.id)
                    : null,
            onRecusarPropostaValor:
                !isPrestador && c.status == ChamadoStatus.propostaValor
                    ? () => ref
                        .read(chamadosProvider.notifier)
                        .recusarPropostaValor(c.id)
                    : null,
            onAceitarRemarcacao: !isPrestador &&
                    c.status == ChamadoStatus.remarcacaoSolicitada
                ? () =>
                    ref.read(chamadosProvider.notifier).aceitarRemarcacao(c.id)
                : null,
            onRecusarRemarcacao: !isPrestador &&
                    c.status == ChamadoStatus.remarcacaoSolicitada
                ? () =>
                    ref.read(chamadosProvider.notifier).recusarRemarcacao(c.id)
                : null,
            onAvaliar: showAvaliar && c.status == ChamadoStatus.concluido
                ? () => AvaliacaoBottomSheet.show(context, c)
                : null,
            onDetalhes: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => AgendamentoDetalhesScreen(chamado: c),
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _proporValor(
    BuildContext context,
    WidgetRef ref,
    Chamado chamado,
  ) async {
    final controller = TextEditingController(
      text: chamado.preco == null ? '' : chamado.preco!.toStringAsFixed(2),
    );
    final valor = await showDialog<double>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Propor valor'),
        content: TextField(
          controller: controller,
          autofocus: true,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(
            labelText: 'Valor do orcamento',
            prefixText: 'R\$ ',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Voltar'),
          ),
          FilledButton(
            onPressed: () {
              final parsed = double.tryParse(
                controller.text.trim().replaceAll(',', '.'),
              );
              Navigator.pop(ctx, parsed);
            },
            child: const Text('Enviar proposta'),
          ),
        ],
      ),
    );
    controller.dispose();

    if (valor == null || valor <= 0) return;
    await ref.read(chamadosProvider.notifier).proporValor(chamado.id, valor);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Valor proposto ao cliente.')),
      );
    }
  }

  Future<void> _solicitarRemarcacao(
    BuildContext context,
    WidgetRef ref,
    Chamado chamado,
  ) async {
    final initial = DateTime.now().add(const Duration(days: 1));
    final data = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 90)),
    );
    if (data == null || !context.mounted) return;

    final hora = await showTimePicker(
      context: context,
      initialTime: const TimeOfDay(hour: 9, minute: 0),
    );
    if (hora == null) return;

    final novaDataHora = DateTime(
      data.year,
      data.month,
      data.day,
      hora.hour,
      hora.minute,
    );

    await ref.read(chamadosProvider.notifier).solicitarRemarcacao(
          chamado.id,
          novaDataHora: novaDataHora,
          motivo: 'Proposta enviada pelo prestador.',
        );
  }

  Future<void> _cancelarSolicitacao(
    BuildContext context,
    WidgetRef ref,
    Chamado chamado,
  ) async {
    final controller = TextEditingController();
    final motivo = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancelar solicitacao'),
        content: TextField(
          controller: controller,
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: 'Motivo opcional',
            hintText: 'Ex: resolvi de outra forma',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Voltar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('Cancelar solicitacao'),
          ),
        ],
      ),
    );
    controller.dispose();

    if (motivo == null) return;
    await ref.read(chamadosProvider.notifier).cancelarSolicitacao(
          chamado.id,
          motivo: motivo.isEmpty ? null : motivo,
        );
  }
}
