import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/adaptive_colors.dart';
import '../../../core/theme/app_colors.dart';
import '../../../domain/entities/agenda_config.dart';
import '../../providers/providers.dart';

class AgendaConfigScreen extends ConsumerStatefulWidget {
  const AgendaConfigScreen({super.key});

  @override
  ConsumerState<AgendaConfigScreen> createState() => _AgendaConfigScreenState();
}

class _AgendaConfigScreenState extends ConsumerState<AgendaConfigScreen> {
  final List<_ServicoEdit> _servicos = [];
  final Set<int> _diasSemana = {1, 2, 3, 4, 5};
  final Set<String> _horarios = {'09:00', '10:30', '14:00', '15:30'};
  final _novoHorarioController = TextEditingController();
  bool _preencheu = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(minhaAgendaProvider.notifier).carregar();
    });
  }

  @override
  void dispose() {
    for (final servico in _servicos) {
      servico.dispose();
    }
    _novoHorarioController.dispose();
    super.dispose();
  }

  void _preencher(AgendaConfig config) {
    if (_preencheu) return;
    for (final servico in _servicos) {
      servico.dispose();
    }
    _servicos
      ..clear()
      ..addAll(config.servicos.map(_ServicoEdit.fromServico));
    if (_servicos.isEmpty) {
      _servicos.add(_ServicoEdit.vazio());
    }

    _diasSemana
      ..clear()
      ..addAll(config.diasSemana.isEmpty
          ? const [1, 2, 3, 4, 5]
          : config.diasSemana);

    _horarios
      ..clear()
      ..addAll(config.horarios.map((e) => e.horario).toSet());
    if (_horarios.isEmpty) {
      _horarios.addAll(const ['09:00', '10:30', '14:00', '15:30']);
    }

    _preencheu = true;
  }

  void _adicionarServico() {
    if (_servicos.length >= 12) {
      _mostrarMensagem('Voce pode cadastrar ate 12 servicos.');
      return;
    }
    setState(() => _servicos.add(_ServicoEdit.vazio()));
  }

  void _removerServico(int index) {
    if (_servicos.length == 1) {
      _mostrarMensagem('Mantenha ao menos um servico.');
      return;
    }
    setState(() => _servicos.removeAt(index).dispose());
  }

  void _adicionarHorario() {
    final horario = _normalizarHorario(_novoHorarioController.text);
    if (horario == null) {
      _mostrarMensagem('Informe um horario no formato HH:mm.');
      return;
    }
    setState(() {
      _horarios.add(horario);
      _novoHorarioController.clear();
    });
  }

  Future<void> _salvar() async {
    final servicos = <AgendaServico>[];

    for (final servico in _servicos) {
      final nome = servico.nome.text.trim();
      final duracao = int.tryParse(servico.duracao.text.trim());
      final preco =
          double.tryParse(servico.preco.text.trim().replaceAll(',', '.'));

      if (nome.length < 3 ||
          duracao == null ||
          duracao < 15 ||
          preco == null ||
          preco <= 0) {
        _mostrarMensagem('Revise nome, duracao e preco dos servicos.');
        return;
      }

      servicos.add(
        AgendaServico(
          nome: nome,
          duracaoMinutos: duracao,
          preco: preco,
        ),
      );
    }

    if (_diasSemana.isEmpty) {
      _mostrarMensagem('Selecione ao menos um dia de atendimento.');
      return;
    }
    if (_horarios.isEmpty) {
      _mostrarMensagem('Informe ao menos um horario.');
      return;
    }

    final horarios = <AgendaHorario>[
      for (final dia in _diasSemana)
        for (final horario in _horarios)
          AgendaHorario(diaSemana: dia, horario: horario),
    ];

    final ok = await ref.read(minhaAgendaProvider.notifier).salvar(
          AgendaConfig(
            servicos: servicos,
            horarios: horarios,
            diasSemana: _diasSemana.toList()..sort(),
          ),
        );

    if (!mounted) return;
    if (ok) {
      final userId = ref.read(authStateProvider).user?.id;
      if (userId != null) {
        ref.invalidate(agendaProfissionalProvider(userId));
      }
      _mostrarMensagem('Agenda salva com sucesso.');
    } else {
      _mostrarMensagem(
          ref.read(minhaAgendaProvider).error ?? 'Nao foi possivel salvar.');
    }
  }

  String? _normalizarHorario(String value) {
    final clean = value.trim();
    final match = RegExp(r'^([01]\d|2[0-3]):([0-5]\d)$').firstMatch(clean);
    if (match == null) return null;
    return '${match.group(1)}:${match.group(2)}';
  }

  void _mostrarMensagem(String mensagem) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(mensagem)));
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(minhaAgendaProvider);
    final data = state.data;
    if (data != null) _preencher(data);
    final horariosOrdenados = _horarios.toList()..sort();

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Servicos e horarios',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Defina o que o cliente pode escolher na tela de agendamento.',
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(color: AppColors.muted),
          ),
          const SizedBox(height: 24),
          if (state.isLoading && state.data == null)
            const Center(child: CircularProgressIndicator())
          else ...[
            _SectionTitle(
              title: 'Servicos',
              action: IconButton(
                tooltip: 'Adicionar servico',
                onPressed: _adicionarServico,
                icon: const Icon(Icons.add_rounded),
              ),
            ),
            const SizedBox(height: 8),
            ...List.generate(_servicos.length, (index) {
              return _ServicoEditor(
                item: _servicos[index],
                onRemove: () => _removerServico(index),
              );
            }),
            const SizedBox(height: 20),
            const _SectionTitle(title: 'Dias de atendimento'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _diasLabels.entries.map((entry) {
                final selected = _diasSemana.contains(entry.key);
                return FilterChip(
                  label: Text(entry.value),
                  selected: selected,
                  onSelected: (value) {
                    setState(() {
                      if (value) {
                        _diasSemana.add(entry.key);
                      } else {
                        _diasSemana.remove(entry.key);
                      }
                    });
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 20),
            const _SectionTitle(title: 'Horarios'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: horariosOrdenados
                  .map(
                    (horario) => InputChip(
                      label: Text(horario),
                      onDeleted: () =>
                          setState(() => _horarios.remove(horario)),
                    ),
                  )
                  .toList(),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _novoHorarioController,
                    keyboardType: TextInputType.datetime,
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[0-9:]')),
                      LengthLimitingTextInputFormatter(5),
                    ],
                    decoration: const InputDecoration(
                      labelText: 'Novo horario',
                      hintText: '09:00',
                      prefixIcon: Icon(Icons.schedule_rounded),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                IconButton.filled(
                  tooltip: 'Adicionar horario',
                  onPressed: _adicionarHorario,
                  icon: const Icon(Icons.add_rounded),
                ),
              ],
            ),
            const SizedBox(height: 28),
            FilledButton.icon(
              onPressed: state.isSaving ? null : _salvar,
              icon: state.isSaving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.save_rounded),
              label: Text(state.isSaving ? 'Salvando...' : 'Salvar agenda'),
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ServicoEdit {
  _ServicoEdit({
    required this.nome,
    required this.duracao,
    required this.preco,
  });

  factory _ServicoEdit.vazio() {
    return _ServicoEdit(
      nome: TextEditingController(),
      duracao: TextEditingController(text: '60'),
      preco: TextEditingController(),
    );
  }

  factory _ServicoEdit.fromServico(AgendaServico servico) {
    return _ServicoEdit(
      nome: TextEditingController(text: servico.nome),
      duracao: TextEditingController(text: servico.duracaoMinutos.toString()),
      preco: TextEditingController(text: servico.preco.toStringAsFixed(0)),
    );
  }

  final TextEditingController nome;
  final TextEditingController duracao;
  final TextEditingController preco;

  void dispose() {
    nome.dispose();
    duracao.dispose();
    preco.dispose();
  }
}

class _ServicoEditor extends StatelessWidget {
  const _ServicoEditor({required this.item, required this.onRemove});

  final _ServicoEdit item;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: context.appCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: context.appBorder),
        ),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: item.nome,
                    decoration: const InputDecoration(
                      labelText: 'Nome do servico',
                      prefixIcon: Icon(Icons.handyman_outlined),
                    ),
                  ),
                ),
                IconButton(
                  tooltip: 'Remover servico',
                  onPressed: onRemove,
                  icon: const Icon(Icons.delete_outline_rounded),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: item.duracao,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    decoration: const InputDecoration(
                      labelText: 'Duracao',
                      suffixText: 'min',
                      prefixIcon: Icon(Icons.timer_outlined),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: item.preco,
                    keyboardType: TextInputType.number,
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[0-9,.]')),
                    ],
                    decoration: const InputDecoration(
                      labelText: 'Preco',
                      prefixText: 'R\$ ',
                      prefixIcon: Icon(Icons.payments_outlined),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, this.action});

  final String title;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
        ),
        if (action != null) action!,
      ],
    );
  }
}

const _diasLabels = {
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sab',
  7: 'Dom',
};
