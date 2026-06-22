import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error_formatter.dart';
import '../../../core/theme/app_colors.dart';
import '../../../domain/entities/chamado.dart';
import '../../../domain/entities/user.dart';
import '../../providers/providers.dart';
import '../../widgets/avaliacao_bottom_sheet.dart';

class AgendamentoDetalhesScreen extends ConsumerStatefulWidget {
  const AgendamentoDetalhesScreen({super.key, required this.chamado});

  final Chamado chamado;

  @override
  ConsumerState<AgendamentoDetalhesScreen> createState() =>
      _AgendamentoDetalhesScreenState();
}

class _AgendamentoDetalhesScreenState
    extends ConsumerState<AgendamentoDetalhesScreen> {
  late Chamado _chamado = widget.chamado;
  bool _processando = false;

  bool get _isPrestador =>
      ref.read(authStateProvider).user?.tipo.isPrestador ?? false;

  Future<void> _atualizar(ChamadoStatus status) async {
    setState(() => _processando = true);
    try {
      final updated = await ref.read(chamadoRepositoryProvider).atualizarStatus(
            chamadoId: _chamado.id,
            status: status,
          );
      await ref.read(chamadosProvider.notifier).carregar();
      if (!mounted) return;
      setState(() => _chamado = updated);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Agendamento atualizado.')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(formatApiError(e))),
      );
    } finally {
      if (mounted) setState(() => _processando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final statusColor = _statusColor(_chamado.status);

    return Scaffold(
      appBar: AppBar(title: const Text('Detalhes do Agendamento')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: statusColor.withValues(alpha: 0.35)),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: statusColor.withValues(alpha: 0.2),
                  child: Icon(_statusIcon(_chamado.status), color: statusColor),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Agendamento ${_chamado.status.label}',
                        style: theme.textTheme.titleMedium?.copyWith(
                          color: statusColor,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      Text(
                        _statusMessage(_chamado.status),
                        style: theme.textTheme.bodyMedium?.copyWith(fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          _SectionLabel('Profissional'),
          _InfoPanel(
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: AppColors.primary.withValues(alpha: 0.18),
                  child: Text(
                    _avatarLetter(_chamado.profissionalNome),
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    _chamado.profissionalNome ??
                        'Profissional #${_chamado.profissionalId}',
                    style: theme.textTheme.labelLarge,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          _SectionLabel('Detalhes do servico'),
          _InfoPanel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _servicoTitulo(_chamado.descricao),
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: AppColors.textPrimaryDark,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  _chamado.descricao,
                  style: theme.textTheme.bodyMedium?.copyWith(height: 1.45),
                ),
                if (_chamado.preco != null) ...[
                  const SizedBox(height: 14),
                  Text(
                    'Valor estimado: R\$ ${_chamado.preco!.toStringAsFixed(2)}',
                    style: theme.textTheme.labelLarge?.copyWith(
                      color: AppColors.textPrimaryDark,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 18),
          if (_isPrestador && _chamado.status == ChamadoStatus.pendente) ...[
            FilledButton.icon(
              onPressed:
                  _processando ? null : () => _atualizar(ChamadoStatus.emAndamento),
              icon: const Icon(Icons.check_rounded),
              label: const Text('Aceitar Agendamento'),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed:
                  _processando ? null : () => _atualizar(ChamadoStatus.recusado),
              icon: const Icon(Icons.close_rounded),
              label: const Text('Recusar Agendamento'),
            ),
          ],
          if (_isPrestador && _chamado.status == ChamadoStatus.emAndamento)
            FilledButton.icon(
              onPressed:
                  _processando ? null : () => _atualizar(ChamadoStatus.concluido),
              icon: const Icon(Icons.task_alt_rounded),
              label: const Text('Marcar como Concluido'),
            ),
          if (!_isPrestador && _chamado.status == ChamadoStatus.concluido)
            FilledButton.icon(
              onPressed: () => AvaliacaoBottomSheet.show(context, _chamado),
              icon: const Icon(Icons.star_rounded),
              label: const Text('Avaliar Servico'),
            ),
        ],
      ),
    );
  }

  String _servicoTitulo(String descricao) {
    final first = descricao.split('\n').first;
    return first.replaceFirst('Servico: ', '').trim();
  }

  String _avatarLetter(String? nome) {
    if (nome == null || nome.trim().isEmpty) return 'P';
    return nome.trim()[0].toUpperCase();
  }

  Color _statusColor(ChamadoStatus status) => switch (status) {
        ChamadoStatus.pendente => AppColors.statusPendente,
        ChamadoStatus.emAndamento => AppColors.statusConcluido,
        ChamadoStatus.concluido => AppColors.primary,
        ChamadoStatus.recusado => AppColors.statusRecusado,
      };

  IconData _statusIcon(ChamadoStatus status) => switch (status) {
        ChamadoStatus.pendente => Icons.pending_actions_rounded,
        ChamadoStatus.emAndamento => Icons.check_circle_rounded,
        ChamadoStatus.concluido => Icons.verified_rounded,
        ChamadoStatus.recusado => Icons.cancel_rounded,
      };

  String _statusMessage(ChamadoStatus status) => switch (status) {
        ChamadoStatus.pendente => 'Aguardando confirmacao do profissional.',
        ChamadoStatus.emAndamento => 'O profissional confirmou sua solicitacao.',
        ChamadoStatus.concluido => 'Servico concluido. Avalie sua experiencia.',
        ChamadoStatus.recusado => 'Solicitacao recusada pelo profissional.',
      };
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text.toUpperCase(),
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: AppColors.primary,
              fontWeight: FontWeight.w900,
              letterSpacing: 0,
            ),
      ),
    );
  }
}

class _InfoPanel extends StatelessWidget {
  const _InfoPanel({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.darkCard,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.darkBorder),
      ),
      child: child,
    );
  }
}
