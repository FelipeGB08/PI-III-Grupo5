import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../core/config/amauc_constants.dart';
import '../../core/theme/app_colors.dart';
import '../../domain/entities/prestador.dart';
import 'profile_avatar.dart';

class PrestadorCard extends StatelessWidget {
  const PrestadorCard({
    super.key,
    required this.prestador,
    required this.onTap,
    this.index = 0,
  });

  final Prestador prestador;
  final VoidCallback onTap;
  final int index;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: theme.cardTheme.color,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: prestador.disponivel
                  ? AppColors.primary.withValues(alpha: 0.2)
                  : AppColors.darkBorder,
            ),
          ),
          child: Row(
            children: [
              _Avatar(prestador: prestador),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      prestador.nome,
                      style: theme.textTheme.titleLarge?.copyWith(fontSize: 16),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      prestador.cidade,
                      style: theme.textTheme.bodyMedium,
                    ),
                    if (prestador.verificado) ...[
                      const SizedBox(height: 8),
                      const _VerifiedBadge(),
                    ],
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: prestador.categorias
                          .take(3)
                          .map((c) => _CategoriaBadge(categoriaId: c))
                          .toList(),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        const Icon(Icons.star_rounded,
                            color: Colors.amber, size: 16),
                        const SizedBox(width: 4),
                        Text(
                          prestador.mediaAvaliacao.toStringAsFixed(1),
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                        if (prestador.distanciaKm != null) ...[
                          const SizedBox(width: 12),
                          Icon(Icons.near_me, size: 14, color: theme.hintColor),
                          const SizedBox(width: 2),
                          Text(
                            '${prestador.distanciaKm!.toStringAsFixed(1)} km',
                            style: theme.textTheme.bodyMedium
                                ?.copyWith(fontSize: 12),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              Icon(Icons.arrow_forward_ios_rounded,
                  size: 16, color: AppColors.primary),
            ],
          ),
        ),
      ),
    )
        .animate()
        .fadeIn(duration: 400.ms, delay: (index * 80).ms)
        .slideY(begin: 0.1, end: 0);
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({required this.prestador});

  final Prestador prestador;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        ProfileAvatar(
          name: prestador.nome,
          imageUrl: prestador.fotoUrl,
          radius: 28,
        ),
        if (prestador.disponivel)
          Positioned(
            right: 0,
            bottom: 0,
            child: Container(
              width: 14,
              height: 14,
              decoration: BoxDecoration(
                color: AppColors.statusConcluido,
                shape: BoxShape.circle,
                border: Border.all(
                  color: Theme.of(context).cardTheme.color ?? Colors.black,
                  width: 2,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _CategoriaBadge extends StatelessWidget {
  const _CategoriaBadge({required this.categoriaId});

  final String categoriaId;

  @override
  Widget build(BuildContext context) {
    final cat = AmaucConstants.categorias.firstWhere(
      (c) => c.id == categoriaId,
      orElse: () => AmaucConstants.categorias.first,
    );
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: cat.cor.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        cat.nome,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: cat.cor,
        ),
      ),
    );
  }
}

class _VerifiedBadge extends StatelessWidget {
  const _VerifiedBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.accent.withValues(alpha: 0.13),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.accent.withValues(alpha: 0.45)),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.verified_rounded, size: 13, color: AppColors.accent),
          SizedBox(width: 5),
          Text(
            'Profissional verificado',
            style: TextStyle(
              color: AppColors.accent,
              fontSize: 10,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}
