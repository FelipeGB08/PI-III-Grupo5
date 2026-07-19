import 'package:flutter/material.dart';

import '../../../core/theme/adaptive_colors.dart';
import '../../../core/theme/app_colors.dart';
import '../../../domain/entities/chamado.dart';
import '../../../domain/entities/prestador.dart';
import 'agendamento_detalhes_screen.dart';

class AgendamentoConfirmadoScreen extends StatelessWidget {
  const AgendamentoConfirmadoScreen({
    super.key,
    required this.chamado,
    required this.prestador,
    required this.servicoNome,
    required this.diaLabel,
    required this.horario,
    required this.endereco,
  });

  final Chamado chamado;
  final Prestador prestador;
  final String servicoNome;
  final String diaLabel;
  final String horario;
  final String endereco;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Confirmacao')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 24, 20, 28),
        children: [
          Center(
            child: Container(
              width: 76,
              height: 76,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.18),
                shape: BoxShape.circle,
                border:
                    Border.all(color: AppColors.primary.withValues(alpha: 0.6)),
              ),
              child: const Icon(
                Icons.check_rounded,
                color: Color(0xFF031016),
                size: 42,
              ),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Agendamento Confirmado!',
            textAlign: TextAlign.center,
            style: theme.textTheme.headlineSmall?.copyWith(
              color: context.appTextPrimary,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Sua solicitacao com ${prestador.nome} foi enviada com sucesso.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: 24),
          _DetailsPanel(
            children: [
              _DetailRow(
                icon: Icons.person_outline_rounded,
                label: 'Profissional',
                value: prestador.nome,
              ),
              _DetailRow(
                icon: Icons.handyman_outlined,
                label: 'Servico',
                value: servicoNome,
              ),
              _DetailRow(
                icon: Icons.calendar_today_outlined,
                label: 'Data e horario',
                value: '$diaLabel as $horario',
              ),
              _DetailRow(
                icon: Icons.location_on_outlined,
                label: 'Local',
                value: endereco,
              ),
              _DetailRow(
                icon: Icons.payments_outlined,
                label: 'Custo estimado',
                value: 'R\$ ${(chamado.preco ?? 0).toStringAsFixed(2)}',
              ),
            ],
          ),
          const SizedBox(height: 18),
          FilledButton(
            onPressed: () {
              Navigator.popUntil(context, (route) => route.isFirst);
            },
            child: const Text('Voltar para tela inicial'),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: () {
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(
                  builder: (_) => AgendamentoDetalhesScreen(chamado: chamado),
                ),
              );
            },
            icon: const Icon(Icons.receipt_long_outlined),
            label: const Text('Ver detalhes'),
          ),
        ],
      ),
    );
  }
}

class _DetailsPanel extends StatelessWidget {
  const _DetailsPanel({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.appCard,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: context.appBorder),
      ),
      child: Column(children: children),
    );
  }
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
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 9),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppColors.primary, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: theme.textTheme.bodyMedium?.copyWith(fontSize: 11),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: theme.textTheme.labelLarge,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
