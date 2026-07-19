import 'package:flutter/material.dart';

import 'app_colors.dart';

extension AdaptiveColors on BuildContext {
  bool get isDarkMode => Theme.of(this).brightness == Brightness.dark;

  Color get appBackground =>
      isDarkMode ? AppColors.darkBackground : AppColors.lightBackground;

  Color get appSurface =>
      isDarkMode ? AppColors.darkSurface : AppColors.lightSurface;

  Color get appCard => isDarkMode ? AppColors.darkCard : AppColors.lightCard;

  Color get appPanel => isDarkMode ? AppColors.darkPanel : AppColors.lightCard;

  Color get appBorder =>
      isDarkMode ? AppColors.darkBorder : const Color(0xFFE2E8F0);

  Color get appTextPrimary =>
      isDarkMode ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;

  Color get appTextSecondary =>
      isDarkMode ? AppColors.textSecondaryDark : AppColors.textSecondaryLight;

  Color get appMuted => isDarkMode ? AppColors.muted : const Color(0xFF64748B);
}
