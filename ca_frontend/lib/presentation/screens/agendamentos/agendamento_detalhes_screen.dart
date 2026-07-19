import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/config/api_config.dart';
import '../../../core/network/api_error_formatter.dart';
import '../../../core/theme/adaptive_colors.dart';
import '../../../core/theme/app_colors.dart';
import '../../../domain/entities/chamado.dart';
import '../../../domain/entities/user.dart';
import '../../providers/providers.dart';
import '../chat/chat_screen.dart';
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

  Future<void> _concluirServico() async {
    final anexarFotos = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Concluir servico'),
        content: const Text(
          'Deseja anexar fotos do servico concluido como evidencia para o cliente?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Voltar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Concluir sem fotos'),
          ),
          FilledButton.icon(
            onPressed: () => Navigator.pop(ctx, true),
            icon: const Icon(Icons.add_photo_alternate_outlined),
            label: const Text('Anexar fotos'),
          ),
        ],
      ),
    );

    if (anexarFotos == null) return;

    var fotos = <XFile>[];
    if (anexarFotos) {
      fotos = await ImagePicker().pickMultiImage(
        imageQuality: 82,
        maxWidth: 1600,
      );

      if (fotos.isEmpty) return;

      if (fotos.length > 5) {
        fotos = fotos.take(5).toList();
      }
    }

    setState(() => _processando = true);
    try {
      if (fotos.isNotEmpty) {
        final withFotos = kIsWeb
            ? await ref.read(apiServiceProvider).uploadFotosConclusaoBytes(
                  chamadoId: _chamado.id,
                  bytesList: await Future.wait(
                    fotos.map((foto) => foto.readAsBytes()),
                  ),
                  filenames: fotos.map((foto) => foto.name).toList(),
                )
            : await ref.read(chamadoRepositoryProvider).uploadFotosConclusao(
                  chamadoId: _chamado.id,
                  filePaths: fotos.map((foto) => foto.path).toList(),
                );
        if (mounted) setState(() => _chamado = withFotos);
      }

      final updated = await ref.read(chamadoRepositoryProvider).atualizarStatus(
            chamadoId: _chamado.id,
            status: ChamadoStatus.concluido,
          );
      await ref.read(chamadosProvider.notifier).carregar();
      if (!mounted) return;
      setState(() => _chamado = updated);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Servico concluido.')),
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

  Future<void> _aceitarRemarcacao() async {
    setState(() => _processando = true);
    try {
      final updated = await ref
          .read(chamadoRepositoryProvider)
          .aceitarRemarcacao(chamadoId: _chamado.id);
      await ref.read(chamadosProvider.notifier).carregar();
      if (!mounted) return;
      setState(() => _chamado = updated);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Remarcacao aceita.')),
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

  Future<void> _recusarRemarcacao() async {
    setState(() => _processando = true);
    try {
      final updated = await ref
          .read(chamadoRepositoryProvider)
          .recusarRemarcacao(chamadoId: _chamado.id);
      await ref.read(chamadosProvider.notifier).carregar();
      if (!mounted) return;
      setState(() => _chamado = updated);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Remarcacao recusada.')),
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

  Future<void> _aceitarPropostaValor() async {
    setState(() => _processando = true);
    try {
      final updated = await ref
          .read(chamadoRepositoryProvider)
          .aceitarPropostaValor(chamadoId: _chamado.id);
      await ref.read(chamadosProvider.notifier).carregar();
      if (!mounted) return;
      setState(() => _chamado = updated);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Proposta de valor aceita.')),
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

  Future<void> _recusarPropostaValor() async {
    setState(() => _processando = true);
    try {
      final updated = await ref
          .read(chamadoRepositoryProvider)
          .recusarPropostaValor(chamadoId: _chamado.id);
      await ref.read(chamadosProvider.notifier).carregar();
      if (!mounted) return;
      setState(() => _chamado = updated);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Proposta de valor recusada.')),
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

  Future<void> _cancelarSolicitacao() async {
    final controller = TextEditingController();
    final motivo = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancelar solicitacao'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Politica: cancelamentos com 2h ou mais de antecedencia ficam com reembolso integral. Abaixo disso, o reembolso fica parcial.',
            ),
            const SizedBox(height: 14),
            TextField(
              controller: controller,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Motivo opcional',
                hintText: 'Ex: resolvi de outra forma',
              ),
            ),
          ],
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

    setState(() => _processando = true);
    try {
      final updated =
          await ref.read(chamadoRepositoryProvider).cancelarSolicitacao(
                chamadoId: _chamado.id,
                motivo: motivo.isEmpty ? null : motivo,
              );
      await ref.read(chamadosProvider.notifier).carregar();
      if (!mounted) return;
      setState(() => _chamado = updated);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Solicitacao cancelada.')),
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
                        style:
                            theme.textTheme.bodyMedium?.copyWith(fontSize: 12),
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
                  _chamado.servicoNome?.isNotEmpty == true
                      ? _chamado.servicoNome!
                      : _servicoTitulo(_chamado.descricao),
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: context.appTextPrimary,
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
                      color: context.appTextPrimary,
                    ),
                  ),
                ],
                if (_chamado.precoProposto != null) ...[
                  const SizedBox(height: 14),
                  Text(
                    'Novo valor proposto: R\$ ${_chamado.precoProposto!.toStringAsFixed(2)}',
                    style: theme.textTheme.labelLarge?.copyWith(
                      color: AppColors.primary,
                    ),
                  ),
                ],
                if (_chamado.duracaoMinutos != null) ...[
                  const SizedBox(height: 10),
                  _DetailRow(
                    icon: Icons.timer_outlined,
                    label: 'Duracao',
                    value: '${_chamado.duracaoMinutos} min',
                  ),
                ],
                if (_chamado.agendadoPara != null) ...[
                  const SizedBox(height: 10),
                  _DetailRow(
                    icon: Icons.event_rounded,
                    label: 'Data e horario',
                    value: _formatDateTime(_chamado.agendadoPara!),
                  ),
                ],
                if (_chamado.enderecoAtendimento?.isNotEmpty == true) ...[
                  const SizedBox(height: 10),
                  _DetailRow(
                    icon: Icons.location_on_outlined,
                    label: 'Endereco',
                    value: _chamado.enderecoAtendimento!,
                  ),
                ],
                if (_chamado.remarcacaoSolicitadaPara != null) ...[
                  const SizedBox(height: 10),
                  _DetailRow(
                    icon: Icons.event_repeat_rounded,
                    label: 'Nova proposta',
                    value: _formatDateTime(_chamado.remarcacaoSolicitadaPara!),
                  ),
                ],
                if (_chamado.motivoRemarcacao?.isNotEmpty == true) ...[
                  const SizedBox(height: 10),
                  _DetailRow(
                    icon: Icons.notes_rounded,
                    label: 'Motivo',
                    value: _chamado.motivoRemarcacao!,
                  ),
                ],
                if (_chamado.motivoCancelamento?.isNotEmpty == true) ...[
                  const SizedBox(height: 10),
                  _DetailRow(
                    icon: Icons.cancel_outlined,
                    label: 'Motivo do cancelamento',
                    value: _chamado.motivoCancelamento!,
                  ),
                ],
                if (_chamado.politicaCancelamento?.isNotEmpty == true) ...[
                  const SizedBox(height: 10),
                  _DetailRow(
                    icon: Icons.policy_outlined,
                    label: 'Politica aplicada',
                    value: _cancelPolicyLabel(_chamado.politicaCancelamento!),
                  ),
                ],
                if (_chamado.reembolsoStatus?.isNotEmpty == true) ...[
                  const SizedBox(height: 10),
                  _DetailRow(
                    icon: Icons.payments_outlined,
                    label: 'Reembolso',
                    value: _refundLabel(_chamado.reembolsoStatus!),
                  ),
                ],
                if (_chamado.canceladoEm?.isNotEmpty == true) ...[
                  const SizedBox(height: 10),
                  _DetailRow(
                    icon: Icons.history_rounded,
                    label: 'Cancelado em',
                    value: _formatDateTime(_chamado.canceladoEm!),
                  ),
                ],
              ],
            ),
          ),
          if (_chamado.fotoUrl?.isNotEmpty == true) ...[
            const SizedBox(height: 18),
            _SectionLabel('Foto anexada'),
            ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: Image.network(
                ApiConfig.resolveAssetUrl(_chamado.fotoUrl),
                height: 210,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const _InfoPanel(
                  child: Text('Nao foi possivel carregar a foto anexada.'),
                ),
              ),
            ),
          ],
          if (_chamado.fotosConclusao.isNotEmpty) ...[
            const SizedBox(height: 18),
            _SectionLabel('Fotos do servico concluido'),
            SizedBox(
              height: 118,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _chamado.fotosConclusao.length,
                separatorBuilder: (_, __) => const SizedBox(width: 10),
                itemBuilder: (context, index) {
                  final url = _chamado.fotosConclusao[index];
                  return _EvidenceImage(url: url);
                },
              ),
            ),
          ],
          const SizedBox(height: 18),
          FilledButton.tonalIcon(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => ChatScreen(chamado: _chamado),
                ),
              );
            },
            icon: const Icon(Icons.chat_bubble_outline_rounded),
            label: const Text('Abrir Chat'),
          ),
          const SizedBox(height: 10),
          if (_isPrestador && _chamado.status == ChamadoStatus.pendente) ...[
            FilledButton.icon(
              onPressed: _processando
                  ? null
                  : () => _atualizar(ChamadoStatus.emAndamento),
              icon: const Icon(Icons.check_rounded),
              label: const Text('Aceitar Agendamento'),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: _processando
                  ? null
                  : () => _atualizar(ChamadoStatus.recusado),
              icon: const Icon(Icons.close_rounded),
              label: const Text('Recusar Agendamento'),
            ),
          ],
          if (_isPrestador && _chamado.status == ChamadoStatus.propostaValor)
            const _InfoPanel(
              child: Text(
                'Aguardando o cliente aceitar ou recusar o novo valor antes da confirmacao.',
              ),
            ),
          if (_isPrestador && _chamado.status == ChamadoStatus.emAndamento)
            FilledButton.icon(
              onPressed: _processando ? null : _concluirServico,
              icon: const Icon(Icons.task_alt_rounded),
              label: const Text('Concluir Servico'),
            ),
          if (!_isPrestador && _chamado.status == ChamadoStatus.concluido)
            FilledButton.icon(
              onPressed: () => AvaliacaoBottomSheet.show(context, _chamado),
              icon: const Icon(Icons.star_rounded),
              label: const Text('Avaliar Servico'),
            ),
          if (!_isPrestador && _chamado.status == ChamadoStatus.pendente)
            OutlinedButton.icon(
              onPressed: _processando ? null : _cancelarSolicitacao,
              icon: const Icon(Icons.cancel_outlined),
              label: const Text('Cancelar Solicitacao'),
            ),
          if (!_isPrestador &&
              _chamado.status == ChamadoStatus.propostaValor) ...[
            FilledButton.icon(
              onPressed: _processando ? null : _aceitarPropostaValor,
              icon: const Icon(Icons.check_rounded),
              label: const Text('Aceitar Novo Valor'),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: _processando ? null : _recusarPropostaValor,
              icon: const Icon(Icons.close_rounded),
              label: const Text('Recusar Novo Valor'),
            ),
          ],
          if (!_isPrestador &&
              _chamado.status == ChamadoStatus.remarcacaoSolicitada) ...[
            FilledButton.icon(
              onPressed: _processando ? null : _aceitarRemarcacao,
              icon: const Icon(Icons.check_rounded),
              label: const Text('Aceitar Novo Horario'),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: _processando ? null : _recusarRemarcacao,
              icon: const Icon(Icons.close_rounded),
              label: const Text('Recusar Remarcacao'),
            ),
          ],
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

  String _formatDateTime(String raw) {
    final parsed = DateTime.tryParse(raw);
    if (parsed == null) return raw;
    final data =
        '${parsed.day.toString().padLeft(2, '0')}/${parsed.month.toString().padLeft(2, '0')}/${parsed.year}';
    final hora = TimeOfDay.fromDateTime(parsed).format(context);
    return '$data as $hora';
  }

  Color _statusColor(ChamadoStatus status) => switch (status) {
        ChamadoStatus.pendente => AppColors.statusPendente,
        ChamadoStatus.propostaValor => AppColors.primary,
        ChamadoStatus.emAndamento => AppColors.statusEmAndamento,
        ChamadoStatus.remarcacaoSolicitada => AppColors.primary,
        ChamadoStatus.concluido => AppColors.primary,
        ChamadoStatus.recusado => AppColors.statusRecusado,
        ChamadoStatus.cancelado => AppColors.muted,
      };

  IconData _statusIcon(ChamadoStatus status) => switch (status) {
        ChamadoStatus.pendente => Icons.pending_actions_rounded,
        ChamadoStatus.propostaValor => Icons.sell_outlined,
        ChamadoStatus.emAndamento => Icons.check_circle_rounded,
        ChamadoStatus.remarcacaoSolicitada => Icons.event_repeat_rounded,
        ChamadoStatus.concluido => Icons.verified_rounded,
        ChamadoStatus.recusado => Icons.cancel_rounded,
        ChamadoStatus.cancelado => Icons.event_busy_rounded,
      };

  String _statusMessage(ChamadoStatus status) => switch (status) {
        ChamadoStatus.pendente => 'Aguardando confirmacao do profissional.',
        ChamadoStatus.propostaValor =>
          'O prestador enviou uma proposta de valor para o cliente.',
        ChamadoStatus.emAndamento =>
          'O profissional confirmou sua solicitacao.',
        ChamadoStatus.remarcacaoSolicitada =>
          'O profissional sugeriu um novo horario.',
        ChamadoStatus.concluido => 'Servico concluido. Avalie sua experiencia.',
        ChamadoStatus.recusado => 'Solicitacao recusada pelo profissional.',
        ChamadoStatus.cancelado => 'Solicitacao cancelada.',
      };

  String _cancelPolicyLabel(String value) => switch (value) {
        'cancelamento_antecipado' => 'Cancelamento antecipado',
        'cancelamento_tardio' => 'Cancelamento tardio',
        'sem_horario_agendado' => 'Sem horario agendado',
        _ => value,
      };

  String _refundLabel(String value) => switch (value) {
        'reembolso_integral' => 'Integral',
        'reembolso_parcial' => 'Parcial',
        _ => value,
      };
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: AppColors.primary, size: 18),
        const SizedBox(width: 8),
        Expanded(
          child: RichText(
            text: TextSpan(
              style: Theme.of(context).textTheme.bodyMedium,
              children: [
                TextSpan(
                  text: '$label: ',
                  style: TextStyle(
                    color: context.appTextPrimary,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                TextSpan(text: value),
              ],
            ),
          ),
        ),
      ],
    );
  }
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
        color: context.appCard,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: context.appBorder),
      ),
      child: child,
    );
  }
}

class _EvidenceImage extends StatelessWidget {
  const _EvidenceImage({required this.url});

  final String url;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: 118,
        height: 118,
        color: context.appCard,
        child: Image.network(
          ApiConfig.resolveAssetUrl(url),
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => const Center(
            child: Icon(
              Icons.broken_image_outlined,
              color: AppColors.muted,
            ),
          ),
        ),
      ),
    );
  }
}
