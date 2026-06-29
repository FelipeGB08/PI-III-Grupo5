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
    this.onCancelar,
    this.onRemarcar,
    this.onProporValor,
    this.onAceitarRemarcacao,
    this.onRecusarRemarcacao,
  });

  final Chamado chamado;
  final bool isPrestador;
  final VoidCallback? onAceitar;
  final VoidCallback? onRecusar;
  final VoidCallback? onConcluir;
  final VoidCallback? onAvaliar;
  final VoidCallback? onDetalhes;
  final VoidCallback? onCancelar;
  final VoidCallback? onRemarcar;
  final VoidCallback? onProporValor;
  final VoidCallback? onAceitarRemarcacao;
  final VoidCallback? onRecusarRemarcacao;

  Color get _statusColor => switch (chamado.status) {
        ChamadoStatus.pendente => AppColors.statusPendente,
        ChamadoStatus.emAndamento => AppColors.statusEmAndamento,
        ChamadoStatus.remarcacaoSolicitada => AppColors.primary,
        ChamadoStatus.concluido => AppColors.statusConcluido,
        ChamadoStatus.recusado => AppColors.statusRecusado,
        ChamadoStatus.cancelado => AppColors.muted,
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
                    _formatShortDate(chamado.dataSolicitacao!),
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
                  chamado.servicoNome?.isNotEmpty == true
                      ? chamado.servicoNome!
                      : chamado.descricao,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleLarge?.copyWith(fontSize: 15),
                ),
                const SizedBox(height: 8),
                Text(
                  isPrestador
                      ? 'Cliente: ${chamado.cidadaoNome ?? "-"}'
                      : 'Prestador: ${chamado.profissionalNome ?? "#${chamado.profissionalId}"}',
                  style: theme.textTheme.bodyMedium,
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    if (chamado.agendadoPara != null)
                      _MetaChip(
                        icon: Icons.event_rounded,
                        label: _formatDateTime(context, chamado.agendadoPara!),
                      ),
                    if (chamado.preco != null)
                      _MetaChip(
                        icon: Icons.payments_outlined,
                        label: 'R\$ ${chamado.preco!.toStringAsFixed(2)}',
                      ),
                    if (chamado.fotoUrl?.isNotEmpty == true)
                      const _MetaChip(
                        icon: Icons.image_outlined,
                        label: 'Com foto',
                      ),
                  ],
                ),
                if (chamado.status == ChamadoStatus.remarcacaoSolicitada &&
                    chamado.remarcacaoSolicitadaPara != null) ...[
                  const SizedBox(height: 12),
                  _NoticeBox(
                    text:
                        'Novo horario proposto: ${_formatDateTime(context, chamado.remarcacaoSolicitadaPara!)}',
                  ),
                ],
                ..._actions(),
                if (onDetalhes != null) ...[
                  const SizedBox(height: 12),
                  _ActionButton(
                    label: 'Ver detalhes',
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

  List<Widget> _actions() {
    if (!isPrestador && chamado.status == ChamadoStatus.remarcacaoSolicitada) {
      return [
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: _ActionButton(
                label: 'Aceitar novo horario',
                color: AppColors.statusConcluido,
                icon: Icons.check_rounded,
                onTap: onAceitarRemarcacao,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _ActionButton(
                label: 'Recusar',
                color: AppColors.statusRecusado,
                icon: Icons.close_rounded,
                onTap: onRecusarRemarcacao,
                outlined: true,
              ),
            ),
          ],
        ),
      ];
    }

    if (!isPrestador &&
        chamado.status == ChamadoStatus.pendente &&
        onCancelar != null) {
      return [
        const SizedBox(height: 14),
        _ActionButton(
          label: 'Cancelar solicitacao',
          color: AppColors.statusRecusado,
          icon: Icons.cancel_outlined,
          onTap: onCancelar,
          outlined: true,
        ),
      ];
    }

    if (isPrestador && chamado.status == ChamadoStatus.pendente) {
      return [
        const SizedBox(height: 14),
        if (onProporValor != null) ...[
          _ActionButton(
            label: 'Propor valor',
            color: AppColors.primary,
            icon: Icons.sell_outlined,
            onTap: onProporValor,
            outlined: true,
          ),
          const SizedBox(height: 10),
        ],
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
      ];
    }

    if (isPrestador && chamado.status == ChamadoStatus.emAndamento) {
      return [
        if (onRemarcar != null) ...[
          const SizedBox(height: 14),
          _ActionButton(
            label: 'Propor remarcacao',
            color: AppColors.primary,
            icon: Icons.event_repeat_rounded,
            onTap: onRemarcar,
            outlined: true,
          ),
        ],
        if (onConcluir != null) ...[
          const SizedBox(height: 10),
          _ActionButton(
            label: 'Marcar como concluido',
            color: AppColors.statusConcluido,
            icon: Icons.task_alt_rounded,
            onTap: onConcluir,
          ),
        ],
      ];
    }

    if (!isPrestador &&
        chamado.status == ChamadoStatus.concluido &&
        onAvaliar != null) {
      return [
        const SizedBox(height: 14),
        _ActionButton(
          label: 'Avaliar servico',
          color: AppColors.primary,
          icon: Icons.star_rounded,
          onTap: onAvaliar,
        ),
      ];
    }

    return const [];
  }

  String _formatShortDate(String raw) {
    final parsed = DateTime.tryParse(raw);
    if (parsed == null) return raw.length >= 10 ? raw.substring(0, 10) : raw;
    return '${parsed.day.toString().padLeft(2, '0')}/${parsed.month.toString().padLeft(2, '0')}';
  }

  String _formatDateTime(BuildContext context, String raw) {
    final parsed = DateTime.tryParse(raw);
    if (parsed == null) return raw;
    final date =
        '${parsed.day.toString().padLeft(2, '0')}/${parsed.month.toString().padLeft(2, '0')}';
    final time = TimeOfDay.fromDateTime(parsed).format(context);
    return '$date as $time';
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.darkSurface,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.darkBorder),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppColors.primary),
          const SizedBox(width: 5),
          Text(
            label,
            style: const TextStyle(
              color: AppColors.textSecondaryDark,
              fontSize: 11,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _NoticeBox extends StatelessWidget {
  const _NoticeBox({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.28)),
      ),
      child: Row(
        children: [
          const Icon(Icons.event_repeat_rounded, color: AppColors.primary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                color: AppColors.textPrimaryDark,
                fontWeight: FontWeight.w800,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
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
      onTap: widget.onTap == null
          ? null
          : () async {
              if (widget.label == 'Aceitar' && !_confirmed) {
                setState(() => _confirmed = true);
                await Future<void>.delayed(const Duration(milliseconds: 250));
              }
              widget.onTap?.call();
            },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: widget.outlined ? Colors.transparent : widget.color,
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
            Flexible(
              child: Text(
                _confirmed && widget.label == 'Aceitar'
                    ? 'Confirmado'
                    : widget.label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: widget.outlined ? widget.color : Colors.white,
                  fontWeight: FontWeight.w900,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
