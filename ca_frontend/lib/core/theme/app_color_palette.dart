import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Cores semânticas usadas pelos componentes próprios do aplicativo.
///
/// Elas ficam no tema para que a preferência de alto contraste alcance também
/// widgets que usam [AdaptiveColors], e não apenas os componentes Material.
class AppColorPalette extends ThemeExtension<AppColorPalette> {
  const AppColorPalette({
    required this.background,
    required this.surface,
    required this.card,
    required this.panel,
    required this.border,
    required this.textPrimary,
    required this.textSecondary,
    required this.muted,
    required this.brand,
    required this.accent,
    required this.onBrand,
  });

  final Color background;
  final Color surface;
  final Color card;
  final Color panel;
  final Color border;
  final Color textPrimary;
  final Color textSecondary;
  final Color muted;
  final Color brand;
  final Color accent;
  final Color onBrand;

  factory AppColorPalette.forBrightness(
    Brightness brightness, {
    required bool highContrast,
  }) {
    if (highContrast) {
      return brightness == Brightness.dark
          ? const AppColorPalette(
              background: Colors.black,
              surface: Colors.black,
              card: Colors.black,
              panel: Colors.black,
              border: Colors.white,
              textPrimary: Colors.white,
              textSecondary: Colors.white,
              muted: Color(0xFFE5E7EB),
              brand: Color(0xFF22D3EE),
              accent: Color(0xFF39FF88),
              onBrand: Colors.black,
            )
          : const AppColorPalette(
              background: Colors.white,
              surface: Colors.white,
              card: Colors.white,
              panel: Colors.white,
              border: Colors.black,
              textPrimary: Colors.black,
              textSecondary: Color(0xFF1F2937),
              muted: Color(0xFF374151),
              brand: Color(0xFF003B6F),
              accent: Color(0xFF075A2B),
              onBrand: Colors.white,
            );
    }

    return brightness == Brightness.dark
        ? const AppColorPalette(
            background: AppColors.darkBackground,
            surface: AppColors.darkSurface,
            card: AppColors.darkCard,
            panel: AppColors.darkPanel,
            border: AppColors.darkBorder,
            textPrimary: AppColors.textPrimaryDark,
            textSecondary: AppColors.textSecondaryDark,
            muted: AppColors.muted,
            brand: AppColors.primary,
            accent: AppColors.accent,
            onBrand: AppColors.actionForeground,
          )
        : const AppColorPalette(
            background: AppColors.lightBackground,
            surface: AppColors.lightSurface,
            card: AppColors.lightCard,
            panel: AppColors.lightCard,
            border: Color(0xFFE2E8F0),
            textPrimary: AppColors.textPrimaryLight,
            textSecondary: AppColors.textSecondaryLight,
            muted: AppColors.textSecondaryLight,
            brand: AppColors.primaryAccessibleLight,
            accent: AppColors.accentAccessibleLight,
            onBrand: Colors.white,
          );
  }

  @override
  AppColorPalette copyWith({
    Color? background,
    Color? surface,
    Color? card,
    Color? panel,
    Color? border,
    Color? textPrimary,
    Color? textSecondary,
    Color? muted,
    Color? brand,
    Color? accent,
    Color? onBrand,
  }) {
    return AppColorPalette(
      background: background ?? this.background,
      surface: surface ?? this.surface,
      card: card ?? this.card,
      panel: panel ?? this.panel,
      border: border ?? this.border,
      textPrimary: textPrimary ?? this.textPrimary,
      textSecondary: textSecondary ?? this.textSecondary,
      muted: muted ?? this.muted,
      brand: brand ?? this.brand,
      accent: accent ?? this.accent,
      onBrand: onBrand ?? this.onBrand,
    );
  }

  @override
  AppColorPalette lerp(ThemeExtension<AppColorPalette>? other, double t) {
    if (other is! AppColorPalette) return this;
    return AppColorPalette(
      background: Color.lerp(background, other.background, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      card: Color.lerp(card, other.card, t)!,
      panel: Color.lerp(panel, other.panel, t)!,
      border: Color.lerp(border, other.border, t)!,
      textPrimary: Color.lerp(textPrimary, other.textPrimary, t)!,
      textSecondary: Color.lerp(textSecondary, other.textSecondary, t)!,
      muted: Color.lerp(muted, other.muted, t)!,
      brand: Color.lerp(brand, other.brand, t)!,
      accent: Color.lerp(accent, other.accent, t)!,
      onBrand: Color.lerp(onBrand, other.onBrand, t)!,
    );
  }
}
