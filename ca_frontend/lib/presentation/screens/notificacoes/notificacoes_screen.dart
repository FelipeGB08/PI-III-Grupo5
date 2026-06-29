import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_colors.dart';
import '../../../domain/entities/notificacao.dart';
import '../../providers/providers.dart';

class NotificacoesScreen extends ConsumerStatefulWidget {
  const NotificacoesScreen({super.key});

  @override
  ConsumerState<NotificacoesScreen> createState() => _NotificacoesScreenState();
}

class _NotificacoesScreenState extends ConsumerState<NotificacoesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(notificacoesProvider.notifier).carregar();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(notificacoesProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Avisos'),
        backgroundColor: AppColors.background,
        actions: [
          IconButton(
            tooltip: 'Atualizar',
            onPressed: () => ref.read(notificacoesProvider.notifier).carregar(),
            icon: const Icon(Icons.refresh_rounded),
          ),
          if (state.naoLidas > 0)
            IconButton(
              tooltip: 'Marcar tudo como lido',
              onPressed: () =>
                  ref.read(notificacoesProvider.notifier).marcarTodasLidas(),
              icon: const Icon(Icons.done_all_rounded),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(notificacoesProvider.notifier).carregar(),
        child: _buildBody(context, state),
      ),
    );
  }

  Widget _buildBody(BuildContext context, NotificacoesState state) {
    if (state.isLoading && state.items.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    if (state.error != null && state.items.isEmpty) {
      return ListView(
        padding: const EdgeInsets.all(24),
        children: [
          _StatePanel(
            icon: Icons.error_outline_rounded,
            title: 'Não foi possível carregar os avisos',
            subtitle: state.error!,
            actionLabel: 'Tentar novamente',
            onAction: () => ref.read(notificacoesProvider.notifier).carregar(),
          ),
        ],
      );
    }

    if (state.items.isEmpty) {
      return ListView(
        padding: const EdgeInsets.all(24),
        children: const [
          _StatePanel(
            icon: Icons.notifications_none_rounded,
            title: 'Nenhum aviso por enquanto',
            subtitle:
                'Atualizações de chamados, agenda e avaliações aparecem aqui.',
          ),
        ],
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      itemBuilder: (context, index) {
        final item = state.items[index];
        return _NotificationTile(
          item: item,
          onTap: item.lida
              ? null
              : () =>
                  ref.read(notificacoesProvider.notifier).marcarLida(item.id),
        );
      },
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemCount: state.items.length,
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({
    required this.item,
    required this.onTap,
  });

  final Notificacao item;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final date = DateFormat('dd/MM HH:mm').format(item.criadoEm.toLocal());
    final unread = !item.lida;

    return Material(
      color: unread
          ? AppColors.primary.withValues(alpha: 0.12)
          : AppColors.surface,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: unread
                  ? AppColors.primary.withValues(alpha: 0.35)
                  : Colors.white.withValues(alpha: 0.06),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: _iconColor(item.tipo).withValues(alpha: 0.16),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  _iconFor(item.tipo),
                  color: _iconColor(item.tipo),
                  size: 22,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            item.titulo,
                            style: Theme.of(context)
                                .textTheme
                                .titleSmall
                                ?.copyWith(
                                  fontWeight: unread
                                      ? FontWeight.w800
                                      : FontWeight.w600,
                                ),
                          ),
                        ),
                        Text(
                          date,
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: AppColors.muted,
                                  ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      item.corpo,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppColors.textSecondaryDark,
                            height: 1.35,
                          ),
                    ),
                    if (unread) ...[
                      const SizedBox(height: 10),
                      Text(
                        'Toque para marcar como lido',
                        style:
                            Theme.of(context).textTheme.labelMedium?.copyWith(
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.w700,
                                ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _iconFor(String tipo) {
    if (tipo.contains('cancel')) return Icons.event_busy_rounded;
    if (tipo.contains('remarc')) return Icons.update_rounded;
    if (tipo.contains('concluido')) return Icons.verified_rounded;
    if (tipo.contains('aceito')) return Icons.check_circle_rounded;
    if (tipo.contains('recusado')) return Icons.block_rounded;
    return Icons.notifications_active_rounded;
  }

  Color _iconColor(String tipo) {
    if (tipo.contains('cancel') || tipo.contains('recusado')) {
      return AppColors.statusRecusado;
    }
    if (tipo.contains('concluido') || tipo.contains('aceito')) {
      return AppColors.statusConcluido;
    }
    if (tipo.contains('remarc')) return AppColors.statusPendente;
    return AppColors.primary;
  }
}

class _StatePanel extends StatelessWidget {
  const _StatePanel({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Column(
        children: [
          Icon(icon, color: AppColors.primary, size: 42),
          const SizedBox(height: 16),
          Text(
            title,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.textSecondaryDark,
                  height: 1.35,
                ),
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: onAction,
              icon: const Icon(Icons.refresh_rounded),
              label: Text(actionLabel!),
            ),
          ],
        ],
      ),
    );
  }
}
