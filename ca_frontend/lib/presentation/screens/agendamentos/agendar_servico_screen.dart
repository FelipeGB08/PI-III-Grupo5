import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error_formatter.dart';
import '../../../core/theme/app_colors.dart';
import '../../../domain/entities/prestador.dart';
import '../../providers/providers.dart';
import 'agendamento_confirmado_screen.dart';

class AgendarServicoScreen extends ConsumerStatefulWidget {
  const AgendarServicoScreen({super.key, required this.prestador});

  final Prestador prestador;

  @override
  ConsumerState<AgendarServicoScreen> createState() =>
      _AgendarServicoScreenState();
}

class _ServicoAgenda {
  const _ServicoAgenda(this.nome, this.preco, this.duracao);

  final String nome;
  final double preco;
  final String duracao;
}

class _AgendarServicoScreenState extends ConsumerState<AgendarServicoScreen> {
  final _enderecoController = TextEditingController();
  final _observacaoController = TextEditingController();

  final _servicos = const [
    _ServicoAgenda('Troca de Chuveiro', 120, 'Aprox. 1 hora'),
    _ServicoAgenda('Instalacao de Tomadas', 90, 'Aprox. 2 horas'),
    _ServicoAgenda('Visita Tecnica', 80, 'Aprox. 40 min'),
  ];

  final _horarios = const ['09:00', '10:30', '14:00', '15:30'];

  int _servicoIndex = 0;
  int _diaIndex = 0;
  String _horario = '09:00';
  bool _enviando = false;

  @override
  void initState() {
    super.initState();
    final user = ref.read(authStateProvider).user;
    _enderecoController.text =
        user?.cidadeAmauc != null ? '${user!.cidadeAmauc} - SC' : '';
  }

  @override
  void dispose() {
    _enderecoController.dispose();
    _observacaoController.dispose();
    super.dispose();
  }

  Future<void> _confirmar() async {
    final endereco = _enderecoController.text.trim();
    if (endereco.isEmpty) {
      _showSnack('Informe o endereco do atendimento.');
      return;
    }

    setState(() => _enviando = true);
    final servico = _servicos[_servicoIndex];
    final dia = _dias[_diaIndex];
    final descricao = [
      'Servico: ${servico.nome}',
      'Data: ${dia.label}',
      'Horario: $_horario',
      'Endereco: $endereco',
      if (_observacaoController.text.trim().isNotEmpty)
        'Observacoes: ${_observacaoController.text.trim()}',
    ].join('\n');

    try {
      final chamado = await ref.read(chamadoRepositoryProvider).criar(
            profissionalId: widget.prestador.id,
            descricao: descricao,
          );
      await ref.read(chamadosProvider.notifier).carregar();
      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => AgendamentoConfirmadoScreen(
            chamado: chamado.copyWith(preco: servico.preco),
            prestador: widget.prestador,
            servicoNome: servico.nome,
            diaLabel: dia.label,
            horario: _horario,
            endereco: endereco,
          ),
        ),
      );
    } catch (e) {
      if (mounted) _showSnack(formatApiError(e));
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  List<_DiaAgenda> get _dias {
    final agora = DateTime.now();
    return List.generate(4, (index) {
      final date = agora.add(Duration(days: index));
      final titulo = switch (index) {
        0 => 'HOJE',
        1 => 'AMANHA',
        _ => _semana[date.weekday - 1],
      };
      return _DiaAgenda(titulo, date.day.toString().padLeft(2, '0'));
    });
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final servico = _servicos[_servicoIndex];

    return Scaffold(
      appBar: AppBar(title: const Text('Agendar Servico')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
        children: [
          _ProfessionalHeader(prestador: widget.prestador),
          const SizedBox(height: 22),
          _StepTitle(number: 1, title: 'Qual servico voce precisa?'),
          const SizedBox(height: 10),
          ...List.generate(_servicos.length, (index) {
            final item = _servicos[index];
            return _SelectablePanel(
              selected: _servicoIndex == index,
              onTap: () => setState(() => _servicoIndex = index),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(item.nome, style: theme.textTheme.labelLarge),
                        const SizedBox(height: 3),
                        Text(
                          item.duracao,
                          style: theme.textTheme.bodyMedium
                              ?.copyWith(fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    'R\$ ${item.preco.toStringAsFixed(0)}',
                    style: const TextStyle(
                      color: AppColors.textPrimaryDark,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            );
          }),
          const SizedBox(height: 20),
          _StepTitle(number: 2, title: 'Escolha data e horario'),
          const SizedBox(height: 10),
          Row(
            children: List.generate(_dias.length, (index) {
              final dia = _dias[index];
              return Expanded(
                child: Padding(
                  padding: EdgeInsets.only(right: index == _dias.length - 1 ? 0 : 8),
                  child: _DateTile(
                    dia: dia,
                    selected: _diaIndex == index,
                    onTap: () => setState(() => _diaIndex = index),
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: _horarios.map((horario) {
              final selected = _horario == horario;
              return ChoiceChip(
                label: Text(horario),
                selected: selected,
                onSelected: (_) => setState(() => _horario = horario),
                selectedColor: AppColors.primary.withValues(alpha: 0.25),
              );
            }).toList(),
          ),
          const SizedBox(height: 20),
          _StepTitle(number: 3, title: 'Local do atendimento'),
          const SizedBox(height: 10),
          TextField(
            controller: _enderecoController,
            maxLines: 2,
            decoration: const InputDecoration(
              prefixIcon: Icon(Icons.home_work_outlined),
              hintText: 'Rua, numero, bairro e cidade',
            ),
          ),
          const SizedBox(height: 20),
          _StepTitle(number: 4, title: 'Observacoes'),
          const SizedBox(height: 10),
          TextField(
            controller: _observacaoController,
            maxLines: 4,
            decoration: const InputDecoration(
              hintText: 'Detalhes adicionais para o profissional...',
            ),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.darkCard,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.darkBorder),
            ),
            child: Row(
              children: [
                const Text('Total estimado:'),
                const Spacer(),
                Text(
                  'R\$ ${servico.preco.toStringAsFixed(2)}',
                  style: theme.textTheme.titleLarge?.copyWith(
                    color: AppColors.textPrimaryDark,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _enviando ? null : _confirmar,
            icon: _enviando
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.arrow_forward_rounded),
            label: Text(_enviando ? 'Enviando...' : 'Confirmar Agendamento'),
          ),
        ],
      ),
    );
  }
}

class _DiaAgenda {
  const _DiaAgenda(this.titulo, this.numero);

  final String titulo;
  final String numero;

  String get label => '$titulo $numero';
}

const _semana = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'];

class _ProfessionalHeader extends StatelessWidget {
  const _ProfessionalHeader({required this.prestador});

  final Prestador prestador;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        CircleAvatar(
          radius: 24,
          backgroundColor: AppColors.primary.withValues(alpha: 0.18),
          child: Text(
            prestador.nome.isNotEmpty ? prestador.nome[0].toUpperCase() : '?',
            style: const TextStyle(
              color: AppColors.primary,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(prestador.nome, style: Theme.of(context).textTheme.titleMedium),
              Text(
                prestador.categoria ?? prestador.cidade,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontSize: 12),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _StepTitle extends StatelessWidget {
  const _StepTitle({required this.number, required this.title});

  final int number;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        CircleAvatar(
          radius: 11,
          backgroundColor: AppColors.primary.withValues(alpha: 0.18),
          child: Text(
            '$number',
            style: const TextStyle(
              color: AppColors.primary,
              fontSize: 11,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          title,
          style: Theme.of(context).textTheme.labelLarge,
        ),
      ],
    );
  }
}

class _SelectablePanel extends StatelessWidget {
  const _SelectablePanel({
    required this.selected,
    required this.onTap,
    required this.child,
  });

  final bool selected;
  final VoidCallback onTap;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: selected ? AppColors.darkPanel : AppColors.darkCard,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: selected ? AppColors.primary : AppColors.darkBorder,
            ),
          ),
          child: child,
        ),
      ),
    );
  }
}

class _DateTile extends StatelessWidget {
  const _DateTile({
    required this.dia,
    required this.selected,
    required this.onTap,
  });

  final _DiaAgenda dia;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        height: 64,
        decoration: BoxDecoration(
          color: selected ? AppColors.primaryDark : AppColors.darkCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.darkBorder,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              dia.titulo,
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 3),
            Text(
              dia.numero,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
            ),
          ],
        ),
      ),
    );
  }
}
