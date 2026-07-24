import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../../../core/config/amauc_constants.dart';
import '../../../core/theme/adaptive_colors.dart';
import '../../../core/theme/app_colors.dart';
import '../../../domain/entities/prestador.dart';
import '../../providers/providers.dart';
import '../../widgets/prestador_card.dart';
import '../../widgets/shimmer_loading.dart';
import 'prestadores_map_screen.dart';
import '../prestador/prestador_profile_screen.dart';

class ClienteDashboardScreen extends ConsumerStatefulWidget {
  const ClienteDashboardScreen({super.key});

  @override
  ConsumerState<ClienteDashboardScreen> createState() =>
      _ClienteDashboardScreenState();
}

class _ClienteDashboardScreenState
    extends ConsumerState<ClienteDashboardScreen> {
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _carregar());
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _carregar() async {
    Position? position;
    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        await Geolocator.requestPermission();
      }
      position = await Geolocator.getCurrentPosition();
    } catch (_) {
      position = null;
    }

    await ref.read(prestadoresProvider.notifier).carregar(
          lat: position?.latitude,
          lng: position?.longitude,
        );
  }

  List<Prestador> _filtrar(List<Prestador> lista, String busca) {
    if (busca.trim().isEmpty) return lista;
    final q = busca.toLowerCase().trim();
    return lista.where((p) {
      final categorias = p.categorias.join(' ').toLowerCase();
      return p.nome.toLowerCase().contains(q) ||
          p.cidade.toLowerCase().contains(q) ||
          categorias.contains(q) ||
          (p.categoria?.toLowerCase().contains(q) ?? false);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(prestadoresProvider);
    final filtrados = _filtrar(state.prestadores, state.busca);
    final selecionados = state.prestadores.where((p) => p.disponivel).length;

    return RefreshIndicator(
      onRefresh: _carregar,
      color: AppColors.primary,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
              child: _ExploreHeader(
                total: state.prestadores.length,
                disponiveis: selecionados,
                cidade: state.cidadeSelecionada,
                onMapTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const PrestadoresMapScreen(),
                  ),
                ),
              ).animate().fadeIn().slideY(begin: -0.05),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
              child: _CitySelector(state: state),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
              child: _SearchField(
                controller: _searchController,
                busca: state.busca,
                onChanged: ref.read(prestadoresProvider.notifier).setBusca,
                onClear: () {
                  _searchController.clear();
                  ref.read(prestadoresProvider.notifier).setBusca('');
                },
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
              child: _AdvancedFiltersBar(state: state),
            ),
          ),
          SliverToBoxAdapter(child: _CategoryStrip(state: state)),
          if (state.erro != null)
            SliverToBoxAdapter(
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: _InlineError(message: state.erro!),
              ),
            ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
            sliver: state.isLoading
                ? const SliverToBoxAdapter(
                    child: SizedBox(height: 400, child: PrestadorListShimmer()),
                  )
                : filtrados.isEmpty
                    ? const SliverFillRemaining(
                        hasScrollBody: false,
                        child: _EmptyExplore(),
                      )
                    : SliverList.separated(
                        itemCount: filtrados.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 14),
                        itemBuilder: (context, index) {
                          final prestador = filtrados[index];
                          return PrestadorCard(
                            prestador: prestador,
                            index: index,
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => PrestadorProfileScreen(
                                  prestador: prestador,
                                ),
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}

class _ExploreHeader extends StatelessWidget {
  const _ExploreHeader({
    required this.total,
    required this.disponiveis,
    required this.cidade,
    required this.onMapTap,
  });

  final int total;
  final int disponiveis;
  final String cidade;
  final VoidCallback onMapTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: context.appCard,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: context.appBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  gradient: AppColors.amaucGradient,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(
                  Icons.explore_rounded,
                  color: AppColors.darkBackground,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Explorar servicos',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            color: context.appTextPrimary,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Profissionais locais em $cidade',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: context.appMuted),
                    ),
                  ],
                ),
              ),
              IconButton.filledTonal(
                tooltip: 'Abrir mapa',
                onPressed: onMapTap,
                icon: const Icon(Icons.map_rounded),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _StatBadge(
                  label: 'Encontrados',
                  value: '$total',
                  icon: Icons.groups_rounded,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _StatBadge(
                  label: 'Disponiveis',
                  value: '$disponiveis',
                  icon: Icons.bolt_rounded,
                  color: AppColors.accent,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatBadge extends StatelessWidget {
  const _StatBadge({
    required this.label,
    required this.value,
    required this.icon,
    this.color = AppColors.primary,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: context.appSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.22)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 19),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: TextStyle(
                    color: color,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: context.appMuted, fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CitySelector extends ConsumerWidget {
  const _CitySelector({required this.state});

  final PrestadoresState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DropdownButtonFormField<String>(
      initialValue: state.cidadeSelecionada,
      dropdownColor: context.appCard,
      decoration: InputDecoration(
        labelText: 'Cidade AMAUC',
        prefixIcon: const Icon(Icons.location_on_outlined),
        filled: true,
        fillColor: context.appSurface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: BorderSide(color: context.appBorder),
        ),
      ),
      items: AmaucConstants.cidades
          .map((cidade) => DropdownMenuItem(
                value: cidade,
                child: Text(cidade, overflow: TextOverflow.ellipsis),
              ))
          .toList(),
      onChanged: (cidade) {
        if (cidade != null) {
          ref.read(prestadoresProvider.notifier).setCidade(cidade);
        }
      },
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({
    required this.controller,
    required this.busca,
    required this.onChanged,
    required this.onClear,
  });

  final TextEditingController controller;
  final String busca;
  final ValueChanged<String> onChanged;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      onChanged: onChanged,
      decoration: InputDecoration(
        labelText: 'Buscar profissionais',
        hintText: 'Buscar por nome, cidade ou servico',
        prefixIcon: const Icon(Icons.search_rounded),
        suffixIcon: busca.isNotEmpty
            ? IconButton(
                tooltip: 'Limpar busca',
                icon: const Icon(Icons.close_rounded),
                onPressed: onClear,
              )
            : const Icon(Icons.tune_rounded),
      ),
    );
  }
}

class _AdvancedFiltersBar extends ConsumerWidget {
  const _AdvancedFiltersBar({required this.state});

  final PrestadoresState state;

  bool get _hasFilters =>
      state.precoMinimo != null ||
      state.precoMaximo != null ||
      state.notaMinima != null ||
      state.disponivelEm != null;

  String _formatarData(DateTime data) {
    return '${data.day.toString().padLeft(2, '0')}/${data.month.toString().padLeft(2, '0')}/${data.year}';
  }

  String _formatarPreco(double valor) => 'R\$ ${valor.toStringAsFixed(0)}';

  String _faixaPreco() {
    if (state.precoMinimo == null) {
      return 'Ate ${_formatarPreco(state.precoMaximo!)}';
    }
    if (state.precoMaximo == null) {
      return 'A partir de ${_formatarPreco(state.precoMinimo!)}';
    }
    return '${_formatarPreco(state.precoMinimo!)} a ${_formatarPreco(state.precoMaximo!)}';
  }

  Future<void> _abrirFiltros(BuildContext context, WidgetRef ref) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _AdvancedFiltersSheet(state: state),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        OutlinedButton.icon(
          onPressed: () => _abrirFiltros(context, ref),
          icon: const Icon(Icons.tune_rounded),
          label: Text(
              _hasFilters ? 'Filtros avancados ativos' : 'Filtros avancados'),
        ),
        if (_hasFilters) ...[
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              if (state.precoMinimo != null || state.precoMaximo != null)
                Chip(label: Text(_faixaPreco())),
              if (state.notaMinima != null)
                Chip(
                    label:
                        Text('Nota ${state.notaMinima!.toStringAsFixed(1)}+')),
              if (state.disponivelEm != null)
                Chip(
                    label:
                        Text('Livre em ${_formatarData(state.disponivelEm!)}')),
              ActionChip(
                avatar: const Icon(Icons.close_rounded, size: 16),
                label: const Text('Limpar'),
                onPressed: () => ref
                    .read(prestadoresProvider.notifier)
                    .setFiltrosAvancados(limpar: true),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

class _AdvancedFiltersSheet extends ConsumerStatefulWidget {
  const _AdvancedFiltersSheet({required this.state});

  final PrestadoresState state;

  @override
  ConsumerState<_AdvancedFiltersSheet> createState() =>
      _AdvancedFiltersSheetState();
}

class _AdvancedFiltersSheetState extends ConsumerState<_AdvancedFiltersSheet> {
  late final TextEditingController _precoMinimoController;
  late final TextEditingController _precoMaximoController;
  double? _notaMinima;
  DateTime? _disponivelEm;
  String? _erro;

  @override
  void initState() {
    super.initState();
    _precoMinimoController = TextEditingController(
      text: widget.state.precoMinimo?.toStringAsFixed(0) ?? '',
    );
    _precoMaximoController = TextEditingController(
      text: widget.state.precoMaximo?.toStringAsFixed(0) ?? '',
    );
    _notaMinima = widget.state.notaMinima;
    _disponivelEm = widget.state.disponivelEm;
  }

  @override
  void dispose() {
    _precoMinimoController.dispose();
    _precoMaximoController.dispose();
    super.dispose();
  }

  double? _lerPreco(String valor) {
    final texto = valor.trim().replaceAll(',', '.');
    if (texto.isEmpty) return null;
    return double.tryParse(texto);
  }

  Future<void> _selecionarData() async {
    final hoje = DateTime.now();
    final escolhida = await showDatePicker(
      context: context,
      initialDate: _disponivelEm == null || _disponivelEm!.isBefore(hoje)
          ? hoje
          : _disponivelEm!,
      firstDate: DateTime(hoje.year, hoje.month, hoje.day),
      lastDate: DateTime(hoje.year + 2),
      helpText: 'Data desejada para o atendimento',
    );
    if (escolhida != null && mounted) {
      setState(() => _disponivelEm = escolhida);
    }
  }

  void _aplicar() {
    final precoMinimo = _lerPreco(_precoMinimoController.text);
    final precoMaximo = _lerPreco(_precoMaximoController.text);
    if ((_precoMinimoController.text.trim().isNotEmpty &&
            precoMinimo == null) ||
        (_precoMaximoController.text.trim().isNotEmpty &&
            precoMaximo == null) ||
        (precoMinimo != null && precoMinimo < 0) ||
        (precoMaximo != null && precoMaximo < 0)) {
      setState(() => _erro = 'Informe valores de preco validos.');
      return;
    }
    if (precoMinimo != null &&
        precoMaximo != null &&
        precoMinimo > precoMaximo) {
      setState(() => _erro = 'O preco minimo nao pode ser maior que o maximo.');
      return;
    }

    ref.read(prestadoresProvider.notifier).setFiltrosAvancados(
          precoMinimo: precoMinimo,
          precoMaximo: precoMaximo,
          notaMinima: _notaMinima,
          disponivelEm: _disponivelEm,
        );
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(24, 20, 24, 24 + bottomInset),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Filtros avancados',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _precoMinimoController,
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Preco minimo',
                        prefixText: 'R\$ ',
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _precoMaximoController,
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Preco maximo',
                        prefixText: 'R\$ ',
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              DropdownButtonFormField<double?>(
                initialValue: _notaMinima,
                decoration: const InputDecoration(labelText: 'Nota minima'),
                items: const [
                  DropdownMenuItem<double?>(
                      value: null, child: Text('Qualquer nota')),
                  DropdownMenuItem(value: 3, child: Text('3,0 ou mais')),
                  DropdownMenuItem(value: 4, child: Text('4,0 ou mais')),
                  DropdownMenuItem(value: 4.5, child: Text('4,5 ou mais')),
                ],
                onChanged: (valor) => setState(() => _notaMinima = valor),
              ),
              const SizedBox(height: 14),
              OutlinedButton.icon(
                onPressed: _selecionarData,
                icon: const Icon(Icons.event_available_outlined),
                label: Text(
                  _disponivelEm == null
                      ? 'Filtrar por disponibilidade em uma data'
                      : 'Disponivel em ${_disponivelEm!.day.toString().padLeft(2, '0')}/${_disponivelEm!.month.toString().padLeft(2, '0')}/${_disponivelEm!.year}',
                ),
              ),
              if (_disponivelEm != null)
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () => setState(() => _disponivelEm = null),
                    child: const Text('Remover data'),
                  ),
                ),
              if (_erro != null) ...[
                const SizedBox(height: 8),
                Text(_erro!,
                    style: const TextStyle(color: AppColors.statusRecusado)),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  TextButton(
                    onPressed: () {
                      ref
                          .read(prestadoresProvider.notifier)
                          .setFiltrosAvancados(limpar: true);
                      Navigator.pop(context);
                    },
                    child: const Text('Limpar filtros'),
                  ),
                  const Spacer(),
                  FilledButton(
                    onPressed: _aplicar,
                    child: const Text('Aplicar filtros'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CategoryStrip extends ConsumerWidget {
  const _CategoryStrip({required this.state});

  final PrestadoresState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SizedBox(
      height: 66,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 8),
        scrollDirection: Axis.horizontal,
        itemCount: AmaucConstants.categorias.length + 1,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (context, index) {
          if (index == 0) {
            return _CategoryChip(
              label: 'Todos',
              icon: Icons.apps_rounded,
              color: AppColors.primary,
              selected: state.categoriaSelecionada == null,
              onTap: () =>
                  ref.read(prestadoresProvider.notifier).setCategoria(null),
            );
          }
          final categoria = AmaucConstants.categorias[index - 1];
          return _CategoryChip(
            label: categoria.nome,
            icon: categoria.icon,
            color: categoria.cor,
            selected: state.categoriaSelecionada == categoria.id,
            onTap: () => ref
                .read(prestadoresProvider.notifier)
                .setCategoria(categoria.id),
          );
        },
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({
    required this.label,
    required this.icon,
    required this.color,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final foreground = selected ? context.appTextPrimary : context.appBrand;
    return Semantics(
      button: true,
      selected: selected,
      label: 'Filtrar por categoria $label',
      onTap: onTap,
      child: InkWell(
        excludeFromSemantics: true,
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: ExcludeSemantics(
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
            decoration: BoxDecoration(
              color: selected ? color.withValues(alpha: 0.18) : context.appCard,
              borderRadius: BorderRadius.circular(999),
              border: Border.all(
                color: selected ? color : context.appBorder,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, color: foreground, size: 17),
                const SizedBox(width: 7),
                Text(
                  label,
                  style: TextStyle(
                    color: selected ? context.appTextPrimary : context.appMuted,
                    fontWeight: FontWeight.w900,
                    fontSize: 12,
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

class _InlineError extends StatelessWidget {
  const _InlineError({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.statusRecusado.withValues(alpha: 0.11),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: AppColors.statusRecusado.withValues(alpha: 0.3),
        ),
      ),
      child: Text(
        message,
        style: const TextStyle(
          color: AppColors.statusRecusado,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _EmptyExplore extends StatelessWidget {
  const _EmptyExplore();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.search_off_rounded,
                color: AppColors.primary,
                size: 30,
              ),
            ),
            const SizedBox(height: 14),
            Text(
              'Nenhum prestador encontrado',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: context.appTextPrimary,
                    fontWeight: FontWeight.w900,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              'Tente mudar a cidade, limpar filtros ou buscar outro servico.',
              textAlign: TextAlign.center,
              style: TextStyle(color: context.appMuted),
            ),
          ],
        ),
      ),
    );
  }
}
