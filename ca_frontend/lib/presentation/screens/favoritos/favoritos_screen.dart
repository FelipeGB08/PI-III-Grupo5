import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../domain/entities/prestador.dart';
import '../../providers/providers.dart';
import '../../widgets/prestador_card.dart';
import '../prestador/prestador_profile_screen.dart';

class FavoritosScreen extends ConsumerStatefulWidget {
  const FavoritosScreen({super.key});

  @override
  ConsumerState<FavoritosScreen> createState() => _FavoritosScreenState();
}

class _FavoritosScreenState extends ConsumerState<FavoritosScreen> {
  final _searchController = TextEditingController();
  String _busca = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final state = ref.read(prestadoresProvider);
      if (state.prestadores.isEmpty && !state.isLoading) {
        ref.read(prestadoresProvider.notifier).carregar();
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final favoritos = ref.watch(favoritosProvider);
    final prestadoresState = ref.watch(prestadoresProvider);
    final favoritosLista = prestadoresState.prestadores
        .where((p) => favoritos.contains(p.id))
        .where(_matchesSearch)
        .toList();

    return RefreshIndicator(
      onRefresh: () => ref.read(prestadoresProvider.notifier).carregar(),
      color: AppColors.primary,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 110),
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Favoritos',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: AppColors.textPrimaryDark,
                        fontWeight: FontWeight.w900,
                      ),
                ),
              ),
              IconButton.filledTonal(
                onPressed: () =>
                    ref.read(prestadoresProvider.notifier).carregar(),
                icon: const Icon(Icons.sync_rounded),
              ),
            ],
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _searchController,
            onChanged: (value) => setState(() => _busca = value),
            decoration: const InputDecoration(
              hintText: 'Buscar em favoritos...',
              prefixIcon: Icon(Icons.search_rounded),
            ),
          ),
          const SizedBox(height: 16),
          if (prestadoresState.isLoading)
            const Padding(
              padding: EdgeInsets.only(top: 80),
              child: Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
            )
          else if (favoritos.isEmpty)
            const _EmptyFavorites()
          else if (favoritosLista.isEmpty)
            const _EmptySearch()
          else
            ...List.generate(favoritosLista.length, (index) {
              final p = favoritosLista[index];
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: PrestadorCard(
                  prestador: p,
                  index: index,
                  onTap: () => _openProfile(context, p),
                ),
              );
            }),
        ],
      ),
    );
  }

  bool _matchesSearch(Prestador p) {
    if (_busca.trim().isEmpty) return true;
    final q = _busca.toLowerCase();
    return p.nome.toLowerCase().contains(q) ||
        p.cidade.toLowerCase().contains(q) ||
        (p.categoria?.toLowerCase().contains(q) ?? false);
  }

  void _openProfile(BuildContext context, Prestador prestador) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PrestadorProfileScreen(prestador: prestador),
      ),
    );
  }
}

class _EmptyFavorites extends StatelessWidget {
  const _EmptyFavorites();

  @override
  Widget build(BuildContext context) {
    return const _EmptyState(
      icon: Icons.favorite_border_rounded,
      title: 'Nenhum favorito ainda',
      message: 'Abra um profissional e toque no coracao para salvar aqui.',
    );
  }
}

class _EmptySearch extends StatelessWidget {
  const _EmptySearch();

  @override
  Widget build(BuildContext context) {
    return const _EmptyState(
      icon: Icons.search_off_rounded,
      title: 'Nada encontrado',
      message: 'Tente buscar por outro nome, cidade ou categoria.',
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.only(top: 64),
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: AppColors.darkCard,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.darkBorder),
      ),
      child: Column(
        children: [
          Icon(icon, color: AppColors.primary, size: 40),
          const SizedBox(height: 12),
          Text(
            title,
            style: theme.textTheme.titleMedium?.copyWith(
              color: AppColors.textPrimaryDark,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            message,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }
}
