import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../core/theme/app_colors.dart';
import '../../domain/entities/chamado.dart';

class ChamadoCard extends StatelessWidget {
  const ChamadoCard({
    super.key,
    required this.chamado,
    this.isPrestador = false,
    this.onAceitar,
    this.onRecusar,
    this.onConcluir,
    this.onAvaliar,
    this.onDetalhes,
  });

  final Chamado chamado;
  final bool isPrestador;
  final VoidCallback? onAceitar;
  final VoidCallback? onRecusar;
  final VoidCallback? onConcluir;
  final VoidCallback? onAvaliar;
  final VoidCallback? onDetalhes;

  Color get _statusColor => switch (chamado.status) {
        ChamadoStatus.pendente => AppColors.statusPendente,
        ChamadoStatus.emAndamento => AppColors.statusEmAndamento,
        ChamadoStatus.concluido => AppColors.statusConcluido,
        ChamadoStatus.recusado => AppColors.statusRecusado,
      };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: theme.cardTheme.color,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _statusColor.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: _statusColor.withValues(alpha: 0.12),
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(17)),
            ),
            child: Row(
              children: [
                Icon(Icons.circle, size: 10, color: _statusColor),
                const SizedBox(width: 8),
                Text(
                  chamado.status.label,
                  style: TextStyle(
                    color: _statusColor,
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                  ),
                ),
                const Spacer(),
                if (chamado.dataSolicitacao != null)
                  Text(
                    chamado.dataSolicitacao!.substring(0, 10),
                    style: theme.textTheme.bodyMedium?.copyWith(fontSize: 11),
                  ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  chamado.descricao,
                  style: theme.textTheme.titleLarge?.copyWith(fontSize: 15),
                ),
                const SizedBox(height: 8),
                Text(
                  isPrestador
                      ? 'Cliente: ${chamado.cidadaoNome ?? "—"}'
                      : 'Prestador: ${chamado.profissionalNome ?? "#${chamado.profissionalId}"}',
                  style: theme.textTheme.bodyMedium,
                ),
                if (isPrestador &&
                    chamado.status == ChamadoStatus.pendente) ...[
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: _ActionButton(
                          label: 'Aceitar',
                          color: AppColors.statusConcluido,
                          icon: Icons.check_rounded,
                          onTap: onAceitar,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _ActionButton(
                          label: 'Recusar',
                          color: AppColors.statusRecusado,
                          icon: Icons.close_rounded,
                          onTap: onRecusar,
                          outlined: true,
                        ),
                      ),
                    ],
                  ),
                ],
                if (isPrestador &&
                    chamado.status == ChamadoStatus.emAndamento) ...[
                  const SizedBox(height: 14),
                  _ActionButton(
                    label: 'Marcar como Concluído',
                    color: AppColors.statusConcluido,
                    icon: Icons.task_alt_rounded,
                    onTap: onConcluir,
                  ),
                ],
                if (!isPrestador &&
                    chamado.status == ChamadoStatus.concluido &&
                    onAvaliar != null) ...[
                  const SizedBox(height: 14),
                  _ActionButton(
                    label: 'Avaliar servico',
                    color: AppColors.primary,
                    icon: Icons.star_rounded,
                    onTap: onAvaliar,
                  ),
                ],
                if (onDetalhes != null) ...[
                  const SizedBox(height: 12),
                  _ActionButton(
                    label: 'Ver Detalhes',
                    color: AppColors.primary,
                    icon: Icons.receipt_long_outlined,
                    onTap: onDetalhes,
                    outlined: true,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn().slideX(begin: 0.05, end: 0);
  }
}

class _ActionButton extends StatefulWidget {
  const _ActionButton({
    required this.label,
    required this.color,
    required this.icon,
    this.onTap,
    this.outlined = false,
  });

  final String label;
  final Color color;
  final IconData icon;
  final VoidCallback? onTap;
  final bool outlined;

  @override
  State<_ActionButton> createState() => _ActionButtonState();
}

class _ActionButtonState extends State<_ActionButton> {
  bool _confirmed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () async {
        if (widget.label == 'Aceitar' && !_confirmed) {
          setState(() => _confirmed = true);
          await Future<void>.delayed(const Duration(milliseconds: 400));
        }
        widget.onTap?.call();
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: widget.outlined
              ? Colors.transparent
              : (_confirmed ? widget.color : widget.color),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: widget.color),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              _confirmed && widget.label == 'Aceitar'
                  ? Icons.check_circle
                  : widget.icon,
              size: 18,
              color: widget.outlined ? widget.color : Colors.white,
            ),
            const SizedBox(width: 6),
            Text(
              _confirmed && widget.label == 'Aceitar'
                  ? 'Confirmado!'
                  : widget.label,
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 13,
                color: widget.outlined ? widget.color : Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
