import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/network/api_error_formatter.dart';
import '../../../core/theme/adaptive_colors.dart';
import '../../../core/theme/app_colors.dart';
import '../../../domain/entities/agenda_config.dart';
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

class _AgendarServicoScreenState extends ConsumerState<AgendarServicoScreen> {
  final _enderecoController = TextEditingController();
  final _observacaoController = TextEditingController();
  final _imagePicker = ImagePicker();

  int _servicoIndex = 0;
  int _diaIndex = 0;
  String? _horario;
  XFile? _fotoProblema;
  Uint8List? _fotoProblemaBytes;
  bool _enviando = false;
  bool _capturandoLocalizacao = false;
  double? _atendimentoLatitude;
  double? _atendimentoLongitude;

  @override
  void initState() {
    super.initState();
    final user = ref.read(authStateProvider).user;
    _enderecoController.text = user?.enderecoPrincipal?.isNotEmpty == true
        ? user!.enderecoPrincipal!
        : (user?.cidadeAmauc != null ? '${user!.cidadeAmauc} - SC' : '');
    if (user?.latitude != null && user?.longitude != null) {
      _atendimentoLatitude = user!.latitude;
      _atendimentoLongitude = user.longitude;
    }
  }

  @override
  void dispose() {
    _enderecoController.dispose();
    _observacaoController.dispose();
    super.dispose();
  }

  Future<void> _confirmar(AgendaConfig agenda) async {
    final servicos = agenda.servicos;
    final dias = _diasDisponiveis(agenda);
    if (servicos.isEmpty || dias.isEmpty) {
      _showSnack('Este profissional ainda nao configurou agenda.');
      return;
    }

    final horarios = _horariosDoDia(agenda, dias[_diaIndex].date);
    final horario = _horario ?? (horarios.isNotEmpty ? horarios.first : null);
    if (horario == null) {
      _showSnack('Escolha um horario disponivel.');
      return;
    }

    final endereco = _enderecoController.text.trim();
    if (endereco.isEmpty) {
      _showSnack('Informe o endereco do atendimento.');
      return;
    }

    setState(() => _enviando = true);
    final servico = servicos[_servicoIndex];
    final dia = dias[_diaIndex];
    final agendadoPara = _combinarDataHorario(dia.date, horario);
    final descricao = [
      'Servico: ${servico.nome}',
      'Data: ${dia.label}',
      'Horario: $horario',
      'Endereco: $endereco',
      if (_observacaoController.text.trim().isNotEmpty)
        'Observacoes: ${_observacaoController.text.trim()}',
    ].join('\n');

    try {
      String? fotoUrl;
      final foto = _fotoProblema;
      if (foto != null) {
        if (kIsWeb) {
          fotoUrl = await ref.read(apiServiceProvider).uploadImagemServicoBytes(
                bytes: _fotoProblemaBytes ?? await foto.readAsBytes(),
                filename: foto.name,
              );
        } else {
          fotoUrl =
              await ref.read(apiServiceProvider).uploadImagemServico(foto.path);
        }
      }

      final chamado = await ref.read(chamadoRepositoryProvider).criar(
            profissionalId: widget.prestador.id,
            descricao: descricao,
            agendaServicoId: servico.id,
            servicoNome: servico.nome,
            preco: servico.preco,
            agendadoPara: agendadoPara,
            enderecoAtendimento: endereco,
            atendimentoLatitude: _atendimentoLatitude,
            atendimentoLongitude: _atendimentoLongitude,
            fotoUrl: fotoUrl,
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
            horario: horario,
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

  List<_DiaAgenda> _diasDisponiveis(AgendaConfig agenda) {
    final diasPermitidos =
        agenda.diasSemana.isEmpty ? {1, 2, 3, 4, 5} : agenda.diasSemana.toSet();
    final agora = DateTime.now();
    final result = <_DiaAgenda>[];

    for (var offset = 0; offset < 21 && result.length < 4; offset++) {
      final date = DateTime(agora.year, agora.month, agora.day + offset);
      if (!diasPermitidos.contains(date.weekday)) continue;
      final titulo = switch (offset) {
        0 => 'HOJE',
        1 => 'AMANHA',
        _ => _semana[date.weekday - 1],
      };
      result.add(_DiaAgenda(titulo, date));
    }
    return result;
  }

  List<String> _horariosDoDia(AgendaConfig agenda, DateTime date) {
    final horarios = agenda.horarios
        .where((item) => item.diaSemana == date.weekday)
        .map((item) => item.horario)
        .toSet()
        .toList()
      ..sort();

    if (horarios.isNotEmpty) return horarios;
    return agenda.horarios.map((item) => item.horario).toSet().toList()..sort();
  }

  DateTime _combinarDataHorario(DateTime date, String horario) {
    final partes = horario.split(':');
    return DateTime(
      date.year,
      date.month,
      date.day,
      int.parse(partes[0]),
      int.parse(partes[1]),
    );
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _selecionarFoto(ImageSource source) async {
    final foto = await _imagePicker.pickImage(
      source: source,
      imageQuality: 78,
      maxWidth: 1600,
    );
    if (foto == null || !mounted) return;
    final bytes = await foto.readAsBytes();
    setState(() {
      _fotoProblema = foto;
      _fotoProblemaBytes = bytes;
    });
  }

  Future<void> _usarLocalizacaoAtual() async {
    if (_capturandoLocalizacao) return;
    setState(() => _capturandoLocalizacao = true);
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        _showSnack('Permita a localizacao para usar o endereco atual.');
        return;
      }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
      final cidade = ref.read(authStateProvider).user?.cidadeAmauc;
      setState(() {
        _atendimentoLatitude = pos.latitude;
        _atendimentoLongitude = pos.longitude;
        _enderecoController.text = cidade == null
            ? 'Localizacao atual via GPS'
            : 'Localizacao atual - $cidade/SC';
      });
      _showSnack('Localizacao atual adicionada ao atendimento.');
    } catch (_) {
      _showSnack('Nao foi possivel capturar sua localizacao agora.');
    } finally {
      if (mounted) setState(() => _capturandoLocalizacao = false);
    }
  }

  Future<void> _abrirOpcoesFoto() async {
    await showModalBottomSheet<void>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Tirar foto'),
              onTap: () {
                Navigator.pop(context);
                _selecionarFoto(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Escolher da galeria'),
              onTap: () {
                Navigator.pop(context);
                _selecionarFoto(ImageSource.gallery);
              },
            ),
            if (_fotoProblema != null)
              ListTile(
                leading: const Icon(Icons.delete_outline),
                title: const Text('Remover foto'),
                onTap: () {
                  Navigator.pop(context);
                  setState(() {
                    _fotoProblema = null;
                    _fotoProblemaBytes = null;
                  });
                },
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final agendaAsync =
        ref.watch(agendaProfissionalProvider(widget.prestador.id));

    return Scaffold(
      appBar: AppBar(title: const Text('Agendar Servico')),
      body: agendaAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _ErrorState(
          message: formatApiError(error),
          onRetry: () =>
              ref.invalidate(agendaProfissionalProvider(widget.prestador.id)),
        ),
        data: (agenda) => _buildContent(agenda),
      ),
    );
  }

  Widget _buildContent(AgendaConfig agenda) {
    final theme = Theme.of(context);
    final servicos = agenda.servicos;
    final dias = _diasDisponiveis(agenda);

    if (servicos.isEmpty || dias.isEmpty) {
      return const _EmptyAgendaState();
    }

    if (_servicoIndex >= servicos.length) _servicoIndex = 0;
    if (_diaIndex >= dias.length) _diaIndex = 0;

    final servico = servicos[_servicoIndex];
    final horarios = _horariosDoDia(agenda, dias[_diaIndex].date);
    if (_horario == null || !horarios.contains(_horario)) {
      _horario = horarios.isNotEmpty ? horarios.first : null;
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
      children: [
        _ProfessionalHeader(prestador: widget.prestador),
        if (widget.prestador.atendeRural ||
            widget.prestador.atendeEmergencia ||
            widget.prestador.cidadesAtendidas.isNotEmpty) ...[
          const SizedBox(height: 14),
          _RegionalInfoBanner(prestador: widget.prestador),
        ],
        if (agenda.usandoPadrao) ...[
          const SizedBox(height: 14),
          const _InfoBanner(
            text: 'Este profissional ainda nao personalizou a agenda. '
                'Mostrando uma configuracao padrao.',
          ),
        ],
        const SizedBox(height: 22),
        _StepTitle(number: 1, title: 'Qual servico voce precisa?'),
        const SizedBox(height: 10),
        ...List.generate(servicos.length, (index) {
          final item = servicos[index];
          return _SelectablePanel(
            selected: _servicoIndex == index,
            semanticLabel:
                'Selecionar servico ${item.nome}, ${item.duracaoLabel}, R\$ ${item.preco.toStringAsFixed(2)}',
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
                        item.duracaoLabel,
                        style:
                            theme.textTheme.bodyMedium?.copyWith(fontSize: 12),
                      ),
                    ],
                  ),
                ),
                Text(
                  'R\$ ${item.preco.toStringAsFixed(0)}',
                  style: TextStyle(
                    color: context.appTextPrimary,
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
          children: List.generate(dias.length, (index) {
            final dia = dias[index];
            return Expanded(
              child: Padding(
                padding:
                    EdgeInsets.only(right: index == dias.length - 1 ? 0 : 8),
                child: _DateTile(
                  dia: dia,
                  selected: _diaIndex == index,
                  onTap: () => setState(() {
                    _diaIndex = index;
                    _horario = null;
                  }),
                ),
              ),
            );
          }),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: horarios.map((horario) {
            final selected = _horario == horario;
            return Semantics(
              button: true,
              label: 'Horario $horario',
              selected: selected,
              hint: 'Selecionar horario disponivel',
              onTap: () => setState(() => _horario = horario),
              child: ExcludeSemantics(
                child: ChoiceChip(
                  label: Text(horario),
                  selected: selected,
                  onSelected: (_) => setState(() => _horario = horario),
                  selectedColor: AppColors.primary.withValues(alpha: 0.25),
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 20),
        _StepTitle(number: 3, title: 'Local do atendimento'),
        const SizedBox(height: 10),
        TextField(
          controller: _enderecoController,
          maxLines: 2,
          onChanged: (_) {
            if (_atendimentoLatitude == null && _atendimentoLongitude == null) {
              return;
            }
            setState(() {
              _atendimentoLatitude = null;
              _atendimentoLongitude = null;
            });
          },
          decoration: const InputDecoration(
            prefixIcon: Icon(Icons.home_work_outlined),
            labelText: 'Endereco do atendimento',
            hintText: 'Rua, numero, bairro e cidade',
          ),
        ),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: _enviando || _capturandoLocalizacao
              ? null
              : _usarLocalizacaoAtual,
          icon: _capturandoLocalizacao
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.my_location_rounded),
          label: Text(
            _capturandoLocalizacao
                ? 'Capturando localizacao...'
                : 'Usar localizacao atual',
          ),
        ),
        if (_atendimentoLatitude != null && _atendimentoLongitude != null) ...[
          const SizedBox(height: 8),
          Semantics(
            label:
                'Localizacao do atendimento registrada com seguranca e visivel apenas no chamado',
            child: const Row(
              children: [
                Icon(
                  Icons.location_on_outlined,
                  size: 16,
                  color: AppColors.statusConcluido,
                ),
                SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Localizacao registrada; as coordenadas ficam privadas no chamado.',
                    style: TextStyle(fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 20),
        _StepTitle(number: 4, title: 'Observacoes'),
        const SizedBox(height: 10),
        TextField(
          controller: _observacaoController,
          maxLines: 4,
          decoration: const InputDecoration(
            labelText: 'Observacoes para o profissional',
            hintText: 'Detalhes adicionais para o profissional...',
          ),
        ),
        const SizedBox(height: 14),
        OutlinedButton.icon(
          onPressed: _enviando ? null : _abrirOpcoesFoto,
          icon: Icon(
            _fotoProblema == null
                ? Icons.add_photo_alternate_outlined
                : Icons.check_circle_outline,
          ),
          label: Text(
            _fotoProblema == null
                ? 'Anexar foto do problema'
                : 'Foto anexada: ${_fotoProblema!.name}',
            overflow: TextOverflow.ellipsis,
          ),
        ),
        if (_fotoProblemaBytes != null) ...[
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Image.memory(
              _fotoProblemaBytes!,
              semanticLabel: 'Foto do problema anexada',
              height: 150,
              width: double.infinity,
              fit: BoxFit.cover,
            ),
          ),
        ],
        const SizedBox(height: 20),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: context.appCard,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: context.appBorder),
          ),
          child: Row(
            children: [
              const Text('Total estimado:'),
              const Spacer(),
              Text(
                'R\$ ${servico.preco.toStringAsFixed(2)}',
                style: theme.textTheme.titleLarge?.copyWith(
                  color: context.appTextPrimary,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: _enviando ? null : () => _confirmar(agenda),
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
    );
  }
}

class _DiaAgenda {
  const _DiaAgenda(this.titulo, this.date);

  final String titulo;
  final DateTime date;

  String get numero => date.day.toString().padLeft(2, '0');
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
          radius: 30,
          backgroundColor: AppColors.primary.withValues(alpha: 0.18),
          child: Text(
            prestador.nome.isNotEmpty ? prestador.nome[0].toUpperCase() : '?',
            style: TextStyle(
              color: context.appBrand,
              fontSize: 20,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(prestador.nome,
                  style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 2),
              Text(
                prestador.categoria ?? prestador.cidade,
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(fontSize: 12),
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
          radius: 13,
          backgroundColor: AppColors.primary.withValues(alpha: 0.18),
          child: Text(
            '$number',
            style: TextStyle(
              color: context.appBrand,
              fontSize: 12,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            title,
            style: Theme.of(context).textTheme.labelLarge,
          ),
        ),
      ],
    );
  }
}

class _SelectablePanel extends StatelessWidget {
  const _SelectablePanel({
    required this.selected,
    required this.semanticLabel,
    required this.onTap,
    required this.child,
  });

  final bool selected;
  final String semanticLabel;
  final VoidCallback onTap;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Semantics(
        button: true,
        selected: selected,
        label: semanticLabel,
        onTap: onTap,
        child: InkWell(
          excludeFromSemantics: true,
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: ExcludeSemantics(
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: selected ? context.appPanel : context.appCard,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: selected ? context.appBrand : context.appBorder,
                ),
              ),
              child: child,
            ),
          ),
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
    final foreground =
        selected ? AppColors.actionForeground : context.appTextPrimary;
    return Semantics(
      button: true,
      selected: selected,
      label: 'Selecionar data ${dia.label}',
      onTap: onTap,
      child: InkWell(
        excludeFromSemantics: true,
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: ExcludeSemantics(
          child: Container(
            height: 80,
            decoration: BoxDecoration(
              color: selected ? AppColors.primaryDark : context.appCard,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: selected ? context.appBrand : context.appBorder,
              ),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  dia.titulo,
                  style: TextStyle(
                    color: foreground,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  dia.numero,
                  style: TextStyle(
                    color: foreground,
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _InfoBanner extends StatelessWidget {
  const _InfoBanner({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
      ),
      child: Text(text, style: const TextStyle(fontSize: 12)),
    );
  }
}

class _RegionalInfoBanner extends StatelessWidget {
  const _RegionalInfoBanner({required this.prestador});

  final Prestador prestador;

  @override
  Widget build(BuildContext context) {
    final tags = <String>[
      if (prestador.atendeRural) 'Atende interior',
      if (prestador.atendeEmergencia) 'Emergencia',
      if (prestador.possuiVeiculo) 'Veiculo proprio',
      if (prestador.taxaDeslocamento != null)
        'Deslocamento R\$ ${prestador.taxaDeslocamento!.toStringAsFixed(2)}',
    ];

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: context.appCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.appBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: tags
                .map(
                  (tag) => Chip(
                    label: Text(tag),
                    visualDensity: VisualDensity.compact,
                  ),
                )
                .toList(),
          ),
          if (prestador.cidadesAtendidas.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              'Cidades atendidas: ${prestador.cidadesAtendidas.join(', ')}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ],
      ),
    );
  }
}

class _EmptyAgendaState extends StatelessWidget {
  const _EmptyAgendaState();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(24),
        child:
            Text('Este profissional ainda nao configurou servicos e horarios.'),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Tentar novamente'),
            ),
          ],
        ),
      ),
    );
  }
}
