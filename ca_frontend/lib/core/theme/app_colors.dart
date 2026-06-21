import 'package:flutter/material.dart';

/// Paleta dark blue-gray com acentos neon para uso em campo.
class AppColors {
  AppColors._();

  // Brand
  static const Color primary = Color(0xFF22D3EE);
  static const Color primaryDark = Color(0xFF0891B2);
  static const Color accent = Color(0xFF39FF88);

  // Dark
  static const Color darkBackground = Color(0xFF07111F);
  static const Color darkSurface = Color(0xFF0D1B2E);
  static const Color darkCard = Color(0xFF13243A);
  static const Color darkPanel = Color(0xFF172B44);
  static const Color darkBorder = Color(0xFF27415F);

  // Light
  static const Color lightBackground = Color(0xFFF8FAFC);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightCard = Color(0xFFF1F5F9);

  // Text
  static const Color textPrimaryDark = Color(0xFFF4F8FF);
  static const Color textSecondaryDark = Color(0xFFB7C6DA);
  static const Color textPrimaryLight = Color(0xFF0F172A);
  static const Color textSecondaryLight = Color(0xFF64748B);
  static const Color muted = Color(0xFF8AA0B8);

  // Status chamados
  static const Color statusPendente = Color(0xFFF59E0B);
  static const Color statusEmAndamento = Color(0xFF3B82F6);
  static const Color statusConcluido = Color(0xFF39FF88);
  static const Color statusRecusado = Color(0xFFEF4444);

  // Gradiente AMAUC
  static const LinearGradient amaucGradient = LinearGradient(
    colors: [Color(0xFF22D3EE), Color(0xFF39FF88)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // --- COMPATIBILIDADE (Não remova, isso evita os erros de "undefined_getter") ---
  static const Color background = darkBackground;
  static const Color surface = darkSurface;
  static const Color card = darkCard;
}
