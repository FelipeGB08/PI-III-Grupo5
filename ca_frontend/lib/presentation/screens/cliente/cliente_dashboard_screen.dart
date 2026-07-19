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
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
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
            Icon(icon, color: color, size: 17),
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
