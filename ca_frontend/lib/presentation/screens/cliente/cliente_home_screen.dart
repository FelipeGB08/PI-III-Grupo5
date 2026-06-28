import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/amauc_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../domain/entities/prestador.dart';
import '../../providers/providers.dart';
import '../../widgets/profile_avatar.dart';
import '../prestador/prestador_profile_screen.dart';

class ClienteHomeScreen extends ConsumerStatefulWidget {
  const ClienteHomeScreen({super.key});

  @override
  ConsumerState<ClienteHomeScreen> createState() => _ClienteHomeScreenState();
}

class _ClienteHomeScreenState extends ConsumerState<ClienteHomeScreen> {
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
  Widget build(BuildContext context) {
    final user = ref.watch(authStateProvider).user;
    final state = ref.watch(prestadoresProvider);
    final favoritos = ref.watch(favoritosProvider);
    final perto = state.prestadores.take(5).toList();

    return RefreshIndicator(
      onRefresh: () => ref.read(prestadoresProvider.notifier).carregar(),
      color: AppColors.primary,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 110),
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Ola, ${_firstName(user?.nome)}',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            color: AppColors.textPrimaryDark,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      user?.cidadeAmauc ?? 'Regiao AMAUC',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
              IconButton.filledTonal(
                onPressed: () {},
                icon: const Icon(Icons.notifications_none_rounded),
              ),
            ],
          ),
          const SizedBox(height: 18),
          _HeroPanel(totalFavoritos: favoritos.length),
          const SizedBox(height: 22),
          _SectionHeader(title: 'Categorias', action: 'Ver todas'),
          const SizedBox(height: 12),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: AmaucConstants.categorias.take(8).length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 4,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 0.9,
            ),
            itemBuilder: (context, index) {
              final categoria = AmaucConstants.categorias[index];
              return _CategoryTile(
                icon: categoria.icon,
                label: categoria.nome,
                color: categoria.cor,
                onTap: () =>
                    ref.read(prestadoresProvider.notifier).setCategoria(
                          categoria.id,
                        ),
              );
            },
          ),
          const SizedBox(height: 24),
          const _SectionHeader(title: 'Perto de mim', action: 'Atualizar'),
          const SizedBox(height: 12),
          if (state.isLoading)
            const _LoadingPanel()
          else if (perto.isEmpty)
            const _EmptyPanel()
          else
            SizedBox(
              height: 172,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: perto.length,
                separatorBuilder: (_, __) => const SizedBox(width: 12),
                itemBuilder: (context, index) {
                  final prestador = perto[index];
                  return _NearbyCard(
                    prestador: prestador,
                    onTap: () => _openPrestador(prestador),
                  );
                },
              ),
            ),
          const SizedBox(height: 24),
          _PromoPanel(onTap: () {}),
        ],
      ),
    );
  }

  String _firstName(String? nome) {
    if (nome == null || nome.trim().isEmpty) return 'bem-vindo';
    return nome.trim().split(' ').first;
  }

  void _openPrestador(Prestador prestador) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PrestadorProfileScreen(prestador: prestador),
      ),
    );
  }
}

class _HeroPanel extends StatelessWidget {
  const _HeroPanel({required this.totalFavoritos});

  final int totalFavoritos;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.darkCard,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.darkBorder),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Servicos locais, sem complicacao',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: AppColors.textPrimaryDark,
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Encontre profissionais da AMAUC e acompanhe tudo pela agenda.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Column(
            children: [
              const Icon(Icons.favorite_rounded, color: AppColors.accent),
              const SizedBox(height: 6),
              Text(
                '$totalFavoritos',
                style: const TextStyle(
                  color: AppColors.textPrimaryDark,
                  fontWeight: FontWeight.w900,
                  fontSize: 22,
                ),
              ),
              const Text(
                'favoritos',
                style: TextStyle(color: AppColors.muted, fontSize: 11),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, required this.action});

  final String title;
  final String action;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: AppColors.textPrimaryDark,
                  fontWeight: FontWeight.w900,
                ),
          ),
        ),
        Text(
          action,
          style: const TextStyle(
            color: AppColors.primary,
            fontWeight: FontWeight.w800,
            fontSize: 12,
          ),
        ),
      ],
    );
  }
}

class _CategoryTile extends StatelessWidget {
  const _CategoryTile({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.darkCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.darkBorder),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 8),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppColors.textPrimaryDark,
                fontSize: 10,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NearbyCard extends StatelessWidget {
  const _NearbyCard({required this.prestador, required this.onTap});

  final Prestador prestador;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        width: 172,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.darkCard,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.darkBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                ProfileAvatar(
                  name: prestador.nome,
                  imageUrl: prestador.fotoUrl,
                  radius: 20,
                  isOnline: prestador.disponivel,
                ),
                const Spacer(),
                const Icon(Icons.star_rounded, color: Colors.amber, size: 16),
                Text(
                  prestador.mediaAvaliacao.toStringAsFixed(1),
                  style: const TextStyle(
                    color: AppColors.textPrimaryDark,
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              prestador.nome,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.labelLarge,
            ),
            const SizedBox(height: 4),
            Text(
              prestador.categoria ?? prestador.cidade,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontSize: 12,
                  ),
            ),
            const Spacer(),
            Text(
              prestador.disponivel ? 'Disponivel' : 'Ocupado',
              style: TextStyle(
                color: prestador.disponivel
                    ? AppColors.accent
                    : AppColors.statusPendente,
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

class _LoadingPanel extends StatelessWidget {
  const _LoadingPanel();

  @override
  Widget build(BuildContext context) {
    return const SizedBox(
      height: 120,
      child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
    );
  }
}

class _EmptyPanel extends StatelessWidget {
  const _EmptyPanel();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.darkCard,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.darkBorder),
      ),
      child: const Text('Nenhum profissional encontrado no momento.'),
    );
  }
}

class _PromoPanel extends StatelessWidget {
  const _PromoPanel({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppColors.primaryDark.withValues(alpha: 0.55),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.primary.withValues(alpha: 0.35)),
        ),
        child: const Row(
          children: [
            Expanded(
              child: Text(
                'Dica: salve profissionais favoritos para agendar mais rapido.',
                style: TextStyle(
                  color: AppColors.textPrimaryDark,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            Icon(Icons.bookmark_add_outlined, color: AppColors.textPrimaryDark),
          ],
        ),
      ),
    );
  }
}
