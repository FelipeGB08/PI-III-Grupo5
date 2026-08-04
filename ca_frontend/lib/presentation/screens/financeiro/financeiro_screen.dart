import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/adaptive_colors.dart';
import '../../../core/theme/app_colors.dart';
import '../../../domain/entities/chamado.dart';
import '../../../domain/entities/financeiro.dart';
import '../../providers/providers.dart';

class FinanceiroScreen extends ConsumerStatefulWidget {
  const FinanceiroScreen({super.key});

  @override
  ConsumerState<FinanceiroScreen> createState() => _FinanceiroScreenState();
}

class _FinanceiroScreenState extends ConsumerState<FinanceiroScreen> {
  final _currency = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(financeiroProvider.notifier).carregar();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(financeiroProvider);
    final data = state.data;

    return Scaffold(
      backgroundColor: context.appBackground,
      appBar: AppBar(
        title: const Text('Financeiro'),
        backgroundColor: context.appBackground,
        actions: [
          IconButton(
            tooltip: 'Atualizar',
            onPressed: () => ref.read(financeiroProvider.notifier).carregar(),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(financeiroProvider.notifier).carregar(),
        child: state.isLoading && data == null
            ? const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              )
            : state.error != null && data == null
                ? ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      _StatePanel(
                        icon: Icons.error_outline_rounded,
                        title: 'Não foi possível carregar o financeiro',
                        subtitle: state.error!,
                        onRetry: () =>
                            ref.read(financeiroProvider.notifier).carregar(),
                      ),
                    ],
                  )
                : _FinanceiroContent(
                    data: data!,
                    selectedStatus: state.statusFiltro,
                    currency: _currency,
                    onFilter: (status) =>
                        ref.read(financeiroProvider.notifier).filtrar(status),
                  ),
      ),
    );
  }
}

class _FinanceiroContent extends StatelessWidget {
  const _FinanceiroContent({
    required this.data,
    required this.selectedStatus,
    required this.currency,
    required this.onFilter,
  });

  final FinanceiroData data;
  final ChamadoStatus? selectedStatus;
  final NumberFormat currency;
  final ValueChanged<ChamadoStatus?> onFilter;

  @override
  Widget build(BuildContext context) {
    final resumo = data.resumo;

    return CustomScrollView(
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 0),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              _HeroBalance(
                title: resumo.labelTotalConcluido,
                value: currency.format(resumo.totalConcluido),
                subtitle: data.isPrestador
                    ? '${resumo.concluidos} serviços concluídos'
                    : '${resumo.concluidos} serviços pagos/concluídos',
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: _MetricCard(
                      label: resumo.labelTotalEmAberto,
                      value: currency.format(resumo.totalEmAberto),
                      icon: Icons.pending_actions_rounded,
                      color: AppColors.statusPendente,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _MetricCard(
                      label: 'Volume total',
                      value: currency.format(resumo.volumeTotal),
                      icon: Icons.analytics_outlined,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _CountCard(
                      label: 'Orçamentos',
                      value: resumo.totalOrcamentos,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _CountCard(
                      label: 'Cancelados',
                      value: resumo.cancelados,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _CountCard(
                      label: 'Recusados',
                      value: resumo.recusados,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 22),
              Text(
                'Orçamentos',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 12),
              _StatusFilter(
                selected: selectedStatus,
                onChanged: onFilter,
              ),
            ]),
          ),
        ),
        if (data.itens.isEmpty)
          const SliverFillRemaining(
            hasScrollBody: false,
            child: Padding(
              padding: EdgeInsets.fromLTRB(18, 14, 18, 28),
              child: _StatePanel(
                icon: Icons.receipt_long_outlined,
                title: 'Nenhum orçamento encontrado',
                subtitle:
                    'Quando houver agendamentos ou serviços, eles aparecem aqui.',
              ),
            ),
          )
        else
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(18, 14, 18, 28),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final item = data.itens[index];
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _FinanceiroItemCard(
                      item: item,
                      currency: currency,
                      isPrestador: data.isPrestador,
                    ),
                  );
                },
                childCount: data.itens.length,
              ),
            ),
          ),
      ],
    );
  }
}

class _HeroBalance extends StatelessWidget {
  const _HeroBalance({
    required this.title,
    required this.value,
    required this.subtitle,
  });

  final String title;
  final String value;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: AppColors.amaucGradient,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: Colors.white.withValues(alpha: 0.86),
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.white.withValues(alpha: 0.85),
                ),
          ),
        ],
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.appCard,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: context.appBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color),
          const SizedBox(height: 12),
          Text(
            label,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: AppColors.muted,
                ),
          ),
          const SizedBox(height: 4),
          FittedBox(
            alignment: Alignment.centerLeft,
            fit: BoxFit.scaleDown,
            child: Text(
              value,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CountCard extends StatelessWidget {
  const _CountCard({
    required this.label,
    required this.value,
  });

  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      decoration: BoxDecoration(
        color: context.appCard,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Text(
            value.toString(),
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: AppColors.primary,
                ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: AppColors.muted,
                ),
          ),
        ],
      ),
    );
  }
}

class _StatusFilter extends StatelessWidget {
  const _StatusFilter({
    required this.selected,
    required this.onChanged,
  });

  final ChamadoStatus? selected;
  final ValueChanged<ChamadoStatus?> onChanged;

  @override
  Widget build(BuildContext context) {
    final options = <ChamadoStatus?>[
      null,
      ChamadoStatus.pendente,
      ChamadoStatus.propostaValor,
      ChamadoStatus.emAndamento,
      ChamadoStatus.remarcacaoSolicitada,
      ChamadoStatus.concluido,
      ChamadoStatus.cancelado,
      ChamadoStatus.recusado,
    ];

    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemBuilder: (context, index) {
          final status = options[index];
          final selectedThis = selected == status;
          return ChoiceChip(
            selected: selectedThis,
            label: Text(status?.label ?? 'Todos'),
            onSelected: (_) => onChanged(status),
          );
        },
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemCount: options.length,
      ),
    );
  }
}

class _FinanceiroItemCard extends StatelessWidget {
  const _FinanceiroItemCard({
    required this.item,
    required this.currency,
    required this.isPrestador,
  });

  final FinanceiroItem item;
  final NumberFormat currency;
  final bool isPrestador;

  @override
  Widget build(BuildContext context) {
    final title = item.servicoNome?.isNotEmpty == true
        ? item.servicoNome!
        : item.descricao ?? 'Serviço';
    final date = item.agendadoPara ?? item.criadoEm;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.appCard,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: context.appBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
              ),
              _StatusPill(status: item.status),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            isPrestador
                ? 'Cliente: ${item.contraparteNome}'
                : 'Prestador: ${item.contraparteNome}',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: context.appTextSecondary,
                ),
          ),
          if (date != null) ...[
            const SizedBox(height: 6),
            Text(
              DateFormat("dd/MM/yyyy 'às' HH:mm", 'pt_BR')
                  .format(date.toLocal()),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.muted,
                  ),
            ),
          ],
          if (item.enderecoAtendimento?.isNotEmpty == true) ...[
            const SizedBox(height: 6),
            Text(
              item.enderecoAtendimento!,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.muted,
                  ),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Text(
                item.preco == null ? 'Sem valor' : currency.format(item.preco),
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const Spacer(),
              if (item.reembolsoStatus != null)
                Text(
                  _refundLabel(item.reembolsoStatus!),
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: AppColors.statusPendente,
                        fontWeight: FontWeight.w700,
                      ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  String _refundLabel(String value) {
    return switch (value) {
      'reembolso_integral' => 'Reembolso integral',
      'reembolso_parcial' => 'Reembolso parcial',
      _ => value,
    };
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.status});

  final ChamadoStatus status;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      ChamadoStatus.pendente => AppColors.statusPendente,
      ChamadoStatus.propostaValor => AppColors.primary,
      ChamadoStatus.emAndamento => AppColors.statusEmAndamento,
      ChamadoStatus.remarcacaoSolicitada => AppColors.statusPendente,
      ChamadoStatus.aguardandoConfirmacaoCliente => AppColors.statusPendente,
      ChamadoStatus.concluido => AppColors.statusConcluido,
      ChamadoStatus.recusado => AppColors.statusRecusado,
      ChamadoStatus.cancelado => AppColors.statusRecusado,
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(
        status.label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: color,
              fontWeight: FontWeight.w800,
            ),
      ),
    );
  }
}

class _StatePanel extends StatelessWidget {
  const _StatePanel({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.onRetry,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: context.appCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: context.appBorder),
      ),
      child: Column(
        children: [
          Icon(icon, color: AppColors.primary, size: 42),
          const SizedBox(height: 14),
          Text(
            title,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: context.appTextSecondary,
                  height: 1.35,
                ),
          ),
          if (onRetry != null) ...[
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Tentar novamente'),
            ),
          ],
        ],
      ),
    );
  }
}
