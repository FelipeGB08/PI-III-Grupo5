import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/api_config.dart';
import '../../../core/theme/adaptive_colors.dart';
import '../../../core/theme/app_colors.dart';
import '../../../domain/entities/prestador.dart';
import '../../providers/providers.dart';
import '../../widgets/profile_avatar.dart';
import '../agendamentos/agendar_servico_screen.dart';

class PrestadorProfileScreen extends ConsumerWidget {
  const PrestadorProfileScreen({super.key, required this.prestador});

  final Prestador prestador;

  void _solicitarServico(BuildContext context, WidgetRef ref) {
    final authState = ref.read(authStateProvider);
    if (authState.user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Faca login para solicitar servicos.')),
      );
      return;
    }
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => AgendarServicoScreen(prestador: prestador),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final avaliacoesAsync = ref.watch(avaliacoesProvider(prestador.id));
    final favoritos = ref.watch(favoritosProvider);
    final isFavorito = favoritos.contains(prestador.id);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Perfil profissional'),
        actions: [
          IconButton(
            tooltip: isFavorito ? 'Remover dos favoritos' : 'Salvar favorito',
            onPressed: () =>
                ref.read(favoritosProvider.notifier).toggle(prestador.id),
            icon: Icon(
              isFavorito
                  ? Icons.favorite_rounded
                  : Icons.favorite_border_rounded,
              color: isFavorito ? AppColors.statusRecusado : null,
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(20, 8, 20, 20),
        child: FilledButton.icon(
          onPressed: () => _solicitarServico(context, ref),
          icon: const Icon(Icons.calendar_month_rounded),
          label: const Text('Agendar servico'),
          style: FilledButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 16),
            backgroundColor: AppColors.accent,
            foregroundColor: AppColors.darkBackground,
            textStyle: const TextStyle(fontWeight: FontWeight.w900),
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        children: [
          _PrestadorHero(prestador: prestador),
          const SizedBox(height: 18),
          _PrestadorBadges(prestador: prestador),
          const SizedBox(height: 14),
          _SectionCard(
            title: 'Atendimento AMAUC',
            icon: Icons.map_outlined,
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (prestador.atendeRural)
                  const _FeatureChip(
                    icon: Icons.agriculture_outlined,
                    label: 'Atende interior',
                  ),
                if (prestador.atendeEmergencia)
                  const _FeatureChip(
                    icon: Icons.flash_on_outlined,
                    label: 'Emergencia',
                    highlighted: true,
                  ),
                if (prestador.possuiVeiculo)
                  const _FeatureChip(
                    icon: Icons.local_shipping_outlined,
                    label: 'Veiculo proprio',
                  ),
                if (prestador.taxaDeslocamento != null)
                  _FeatureChip(
                    icon: Icons.route_outlined,
                    label:
                        'Deslocamento R\$ ${prestador.taxaDeslocamento!.toStringAsFixed(2)}',
                  ),
                if (!prestador.atendeRural &&
                    !prestador.atendeEmergencia &&
                    !prestador.possuiVeiculo &&
                    prestador.taxaDeslocamento == null)
                  const Text('Informacoes regionais ainda nao cadastradas.'),
              ],
            ),
          ),
          if (prestador.cidadesAtendidas.isNotEmpty)
            _SectionCard(
              title: 'Cidades atendidas',
              icon: Icons.location_city_outlined,
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: prestador.cidadesAtendidas
                    .map((cidade) => _FeatureChip(
                          icon: Icons.place_outlined,
                          label: cidade,
                        ))
                    .toList(),
              ),
            ),
          _SectionCard(
            title: 'Sobre o profissional',
            icon: Icons.badge_outlined,
            child: Text(
              prestador.bio?.isNotEmpty == true
                  ? prestador.bio!
                  : 'Profissional ainda nao cadastrou biografia.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    height: 1.45,
                    color: context.appTextSecondary,
                  ),
            ),
          ),
          if (prestador.categorias.isNotEmpty)
            _SectionCard(
              title: 'Categorias',
              icon: Icons.handyman_outlined,
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: prestador.categorias
                    .map((categoria) => _FeatureChip(
                          icon: Icons.check_rounded,
                          label: categoria,
                        ))
                    .toList(),
              ),
            ),
          if (prestador.curriculoTexto?.isNotEmpty == true)
            _SectionCard(
              title: 'Curriculo Vivo',
              icon: Icons.description_outlined,
              child: Text(
                prestador.curriculoTexto!,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      height: 1.45,
                      color: context.appTextSecondary,
                    ),
              ),
            ),
          if (prestador.portfolioUrl?.isNotEmpty == true)
            _SectionCard(
              title: 'Link de portfolio',
              icon: Icons.collections_outlined,
              child: SelectableText(
                prestador.portfolioUrl!,
                style: TextStyle(color: context.appBrand),
              ),
            ),
          if (prestador.portfolioUrls.isNotEmpty)
            _SectionCard(
              title: 'Galeria de trabalhos',
              icon: Icons.photo_library_outlined,
              child: _ImageGallery(urls: prestador.portfolioUrls),
            ),
          if (prestador.certificacoes.isNotEmpty)
            _SectionCard(
              title: 'Certificacoes',
              icon: Icons.workspace_premium_outlined,
              child: _ImageGallery(urls: prestador.certificacoes),
            ),
          _SectionCard(
            title: 'Avaliacoes',
            icon: Icons.star_outline_rounded,
            child: avaliacoesAsync.when(
              loading: () => const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
              error: (error, _) => Text('Nao foi possivel carregar: $error'),
              data: (resumo) {
                if (resumo.avaliacoes.isEmpty) {
                  return const Text(
                    'Este profissional ainda nao recebeu avaliacoes.',
                  );
                }
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Media: ${resumo.media.toStringAsFixed(1)} estrelas',
                      style: TextStyle(
                        color: context.appTextPrimary,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ...resumo.avaliacoes.take(5).map(
                          (a) => Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: Text(
                              '${a.nota} estrelas - ${a.comentario ?? 'Sem comentario'}',
                            ),
                          ),
                        ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _PrestadorBadges extends StatelessWidget {
  const _PrestadorBadges({required this.prestador});

  final Prestador prestador;

  @override
  Widget build(BuildContext context) {
    final badges = <_BadgeData>[
      if (prestador.verificado)
        const _BadgeData(
            Icons.verified_rounded, 'Verificado', AppColors.accent),
      if (prestador.avaliacoesPositivas >= 5)
        const _BadgeData(
          Icons.thumb_up_alt_rounded,
          'Bem avaliado',
          AppColors.primary,
        ),
      if (prestador.mediaAvaliacao >= 4.8 && prestador.totalServicos >= 3)
        const _BadgeData(
          Icons.star_rounded,
          'Top regional',
          AppColors.statusPendente,
        ),
      if (prestador.totalServicos >= 10)
        const _BadgeData(
          Icons.military_tech_rounded,
          'Experiente',
          AppColors.accent,
        ),
    ];

    if (badges.isEmpty) return const SizedBox.shrink();

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: badges
          .map(
            (badge) => _FeatureChip(
              icon: badge.icon,
              label: badge.label,
              highlighted: badge.color == AppColors.accent,
            ),
          )
          .toList(),
    );
  }
}

class _BadgeData {
  const _BadgeData(this.icon, this.label, this.color);

  final IconData icon;
  final String label;
  final Color color;
}

class _ImageGallery extends StatelessWidget {
  const _ImageGallery({required this.urls});

  final List<String> urls;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 128,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: urls.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (context, index) {
          final url = urls[index];
          return ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Container(
              width: 128,
              color: context.appSurface,
              child: Image.network(
                ApiConfig.resolveAssetUrl(url),
                semanticLabel:
                    'Imagem do portfolio ${index + 1} de ${urls.length}',
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
        },
      ),
    );
  }
}

class _PrestadorHero extends StatelessWidget {
  const _PrestadorHero({required this.prestador});

  final Prestador prestador;

  @override
  Widget build(BuildContext context) {
    final categoria = prestador.categoria ??
        (prestador.categorias.isNotEmpty ? prestador.categorias.first : null);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: context.appCard,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.18)),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.08),
            blurRadius: 28,
            offset: const Offset(0, 16),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ProfileAvatar(
                name: prestador.nome,
                imageUrl: prestador.fotoUrl,
                radius: 42,
                isOnline: prestador.disponivel,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            prestador.nome,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context)
                                .textTheme
                                .headlineSmall
                                ?.copyWith(
                                  color: context.appTextPrimary,
                                  fontWeight: FontWeight.w900,
                                ),
                          ),
                        ),
                        if (prestador.verificado)
                          const Icon(
                            Icons.verified_rounded,
                            color: AppColors.accent,
                            size: 20,
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      categoria ?? 'Profissional AMAUC',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: context.appTextSecondary,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(
                          Icons.location_on_outlined,
                          color: AppColors.muted,
                          size: 15,
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            prestador.cidade,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: AppColors.muted),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: _MetricTile(
                  label: 'Avaliacao',
                  value: prestador.mediaAvaliacao.toStringAsFixed(1),
                  icon: Icons.star_rounded,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _MetricTile(
                  label: 'Servicos',
                  value: '${prestador.totalServicos}',
                  icon: Icons.work_outline_rounded,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _MetricTile(
                  label: 'Status',
                  value: prestador.disponivel ? 'Livre' : 'Ocupado',
                  icon: Icons.bolt_rounded,
                  accent: prestador.disponivel
                      ? AppColors.accent
                      : AppColors.statusPendente,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({
    required this.label,
    required this.value,
    required this.icon,
    this.accent = AppColors.primary,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final foreground = _foreground(context);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: context.appSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.appBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: foreground, size: 18),
          const SizedBox(height: 8),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: foreground,
              fontSize: 16,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(color: context.appTextSecondary, fontSize: 11),
          ),
        ],
      ),
    );
  }

  Color _foreground(BuildContext context) {
    if (context.isDarkMode) return accent;
    if (accent == AppColors.accent) return context.appAccent;
    if (accent == AppColors.statusPendente) {
      return AppColors.statusPendenteAccessibleLight;
    }
    return context.appBrand;
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.icon,
    required this.child,
  });

  final String title;
  final IconData icon;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.appCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: context.appBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: context.appBrand, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: context.appTextPrimary,
                        fontWeight: FontWeight.w900,
                      ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _FeatureChip extends StatelessWidget {
  const _FeatureChip({
    required this.icon,
    required this.label,
    this.highlighted = false,
  });

  final IconData icon;
  final String label;
  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    final color = highlighted ? AppColors.accent : AppColors.primary;
    final foreground = highlighted ? context.appAccent : context.appBrand;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.11),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.28)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: foreground, size: 15),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: context.appTextPrimary,
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}
