import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../domain/entities/chamado.dart';
import '../../../domain/entities/user.dart';
import '../../providers/providers.dart';
import '../../widgets/avaliacao_bottom_sheet.dart';
import '../../widgets/chamado_card.dart';
import '../../widgets/shimmer_loading.dart';

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
            'Central de Chamados',
            style: Theme.of(context).textTheme.headlineLarge?.copyWith(fontSize: 24),
          ),
        ),
        const SizedBox(height: 16),
        TabBar(
          controller: _tabController,
          labelStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
          tabs: const [
            Tab(text: 'Pendentes'),
            Tab(text: 'Em Progresso'),
            Tab(text: 'Histórico'),
          ],
        ),
        Expanded(
          child: state.isLoading
              ? const PrestadorListShimmer()
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _ChamadosList(
                      chamados: _filter(state.chamados, ChamadoStatus.pendente),
                      isPrestador: isPrestador,
                    ),
                    _ChamadosList(
                      chamados:
                          _filter(state.chamados, ChamadoStatus.emAndamento),
                      isPrestador: isPrestador,
                      showConcluir: true,
                    ),
                    _ChamadosList(
                      chamados: state.chamados
                          .where((c) =>
                              c.status == ChamadoStatus.concluido ||
                              c.status == ChamadoStatus.recusado)
                          .toList(),
                      isPrestador: isPrestador,
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
    this.showConcluir = false,
  });

  final List<Chamado> chamados;
  final bool isPrestador;
  final bool showConcluir;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (chamados.isEmpty) {
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
        itemCount: chamados.length,
        itemBuilder: (_, i) {
          final c = chamados[i];
          return ChamadoCard(
            chamado: c,
            isPrestador: isPrestador,
            onAceitar: () => ref.read(chamadosProvider.notifier).aceitar(c.id),
            onRecusar: () => ref.read(chamadosProvider.notifier).recusar(c.id),
            onConcluir: showConcluir
                ? () => ref.read(chamadosProvider.notifier).concluir(c.id)
                : null,
          );
        },
      ),
    );
  }
}
