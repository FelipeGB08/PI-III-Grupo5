import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../../../core/config/amauc_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../domain/entities/prestador.dart';
import '../../providers/providers.dart';
import '../../widgets/prestador_card.dart';
import '../../widgets/shimmer_loading.dart';
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

  Future<void> _carregar() async {
    Position? position;
    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        await Geolocator.requestPermission();
      }
      position = await Geolocator.getCurrentPosition();
    } catch (_) {}

    await ref.read(prestadoresProvider.notifier).carregar(
          lat: position?.latitude,
          lng: position?.longitude,
        );
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<Prestador> _filtrar(List<Prestador> lista, String busca) {
    if (busca.isEmpty) return lista;
    final q = busca.toLowerCase();
    return lista
        .where((p) =>
            p.nome.toLowerCase().contains(q) ||
            p.cidade.toLowerCase().contains(q) ||
            (p.categoria?.toLowerCase().contains(q) ?? false))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(prestadoresProvider);
    final filtrados = _filtrar(state.prestadores, state.busca);
    final theme = Theme.of(context);

    return RefreshIndicator(
      onRefresh: _carregar,
      color: AppColors.primary,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(child: _CidadeSelector(state: state)),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: TextField(
                controller: _searchController,
                onChanged: ref.read(prestadoresProvider.notifier).setBusca,
                decoration: InputDecoration(
                  hintText: 'Buscar prestador ou serviço...',
                  prefixIcon: const Icon(Icons.search_rounded),
                  suffixIcon: state.busca.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () {
                            _searchController.clear();
                            ref.read(prestadoresProvider.notifier).setBusca('');
                          },
                        )
                      : null,
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(child: _CategoriaCarousel(state: state)),
          if (state.erro != null)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: Text(
                  state.erro!,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: AppColors.statusRecusado,
                    fontSize: 12,
                  ),
                ),
              ),
            ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
            sliver: state.isLoading
                ? const SliverToBoxAdapter(
                    child: SizedBox(height: 400, child: PrestadorListShimmer()),
                  )
                : filtrados.isEmpty
                    ? SliverFillRemaining(
                        hasScrollBody: false,
                        child: Center(
                          child: Text(
                            'Nenhum prestador encontrado',
                            style: theme.textTheme.bodyMedium,
                          ),
                        ),
                      )
                    : SliverList.separated(
                        itemCount: filtrados.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 14),
                        itemBuilder: (context, index) {
                          final p = filtrados[index];
                          return PrestadorCard(
                            prestador: p,
                            index: index,
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) =>
                                    PrestadorProfileScreen(prestador: p),
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

class _CidadeSelector extends ConsumerWidget {
  const _CidadeSelector({required this.state});

  final PrestadoresState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: AppColors.amaucGradient,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.3),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        children: [
          const Icon(Icons.location_on_rounded, color: Colors.black, size: 28),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Sua cidade AMAUC',
                  style: TextStyle(
                    color: Colors.black54,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: state.cidadeSelecionada,
                    isExpanded: true,
                    dropdownColor: AppColors.darkCard,
                    style: const TextStyle(
                      color: Colors.black,
                      fontWeight: FontWeight.w900,
                      fontSize: 18,
                    ),
                    items: AmaucConstants.cidades
                        .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                        .toList(),
                    onChanged: (v) {
                      if (v != null) {
                        ref.read(prestadoresProvider.notifier).setCidade(v);
                      }
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn().slideY(begin: -0.1, end: 0);
  }
}

class _CategoriaCarousel extends ConsumerWidget {
  const _CategoriaCarousel({required this.state});

  final PrestadoresState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SizedBox(
      height: 110,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
        scrollDirection: Axis.horizontal,
        itemCount: AmaucConstants.categorias.length + 1,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          if (index == 0) {
            final selected = state.categoriaSelecionada == null;
            return _CategoriaItem(
              nome: 'Todos',
              icon: Icons.apps_rounded,
              cor: AppColors.primary,
              selected: selected,
              onTap: () =>
                  ref.read(prestadoresProvider.notifier).setCategoria(null),
            );
          }
          final cat = AmaucConstants.categorias[index - 1];
          final selected = state.categoriaSelecionada == cat.id;
          return _CategoriaItem(
            nome: cat.nome,
            icon: cat.icon,
            cor: cat.cor,
            selected: selected,
            onTap: () =>
                ref.read(prestadoresProvider.notifier).setCategoria(cat.id),
          );
        },
      ),
    );
  }
}

class _CategoriaItem extends StatefulWidget {
  const _CategoriaItem({
    required this.nome,
    required this.icon,
    required this.cor,
    required this.selected,
    required this.onTap,
  });

  final String nome;
  final IconData icon;
  final Color cor;
  final bool selected;
  final VoidCallback onTap;

  @override
  State<_CategoriaItem> createState() => _CategoriaItemState();
}

class _CategoriaItemState extends State<_CategoriaItem> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) => setState(() => _pressed = false),
      onTapCancel: () => setState(() => _pressed = false),
      onTap: widget.onTap,
      child: AnimatedScale(
        scale: _pressed ? 0.92 : 1,
        duration: const Duration(milliseconds: 150),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          width: 80,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: widget.selected
                ? widget.cor.withValues(alpha: 0.2)
                : Theme.of(context).cardTheme.color,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: widget.selected
                  ? widget.cor
                  : Colors.transparent,
              width: 2,
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(widget.icon, color: widget.cor, size: 28),
              const SizedBox(height: 6),
              Text(
                widget.nome,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: widget.selected ? widget.cor : null,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
