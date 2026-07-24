import 'package:flutter/material.dart';

import 'app_color_palette.dart';

extension AdaptiveColors on BuildContext {
  bool get isDarkMode => Theme.of(this).brightness == Brightness.dark;

  AppColorPalette get _palette =>
      Theme.of(this).extension<AppColorPalette>() ??
      AppColorPalette.forBrightness(
        Theme.of(this).brightness,
        highContrast: false,
      );

  Color get appBackground => _palette.background;

  Color get appSurface => _palette.surface;

  Color get appCard => _palette.card;

  Color get appPanel => _palette.panel;

  Color get appBorder => _palette.border;

  Color get appTextPrimary => _palette.textPrimary;

  Color get appTextSecondary => _palette.textSecondary;

  Color get appMuted => _palette.muted;

  Color get appBrand => _palette.brand;

  Color get appAccent => _palette.accent;

  Color get appOnBrand => _palette.onBrand;
}
