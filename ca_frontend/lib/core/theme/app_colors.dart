import 'package:flutter/material.dart';

/// Paleta Tailwind-inspired para light/dark mode.
class AppColors {
  AppColors._();

  // Brand
  static const Color primary = Color(0xFF08D7FF);
  static const Color primaryDark = Color(0xFF00B4D8);
  static const Color accent = Color(0xFF7C3AED);

  // Dark
  static const Color darkBackground = Color(0xFF050505);
  static const Color darkSurface = Color(0xFF141414);
  static const Color darkCard = Color(0xFF1D1D1D);

  // Light
  static const Color lightBackground = Color(0xFFF8FAFC);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightCard = Color(0xFFF1F5F9);

  // Text
  static const Color textPrimaryDark = Color(0xFFF2F2F2);
  static const Color textSecondaryDark = Color(0xFFB7B7B7);
  static const Color textPrimaryLight = Color(0xFF0F172A);
  static const Color textSecondaryLight = Color(0xFF64748B);
  static const Color muted = Color(0xFF777777);

  // Status chamados
  static const Color statusPendente = Color(0xFFF59E0B);
  static const Color statusEmAndamento = Color(0xFF3B82F6);
  static const Color statusConcluido = Color(0xFF10B981);
  static const Color statusRecusado = Color(0xFFEF4444);

  // Gradiente AMAUC
  static const LinearGradient amaucGradient = LinearGradient(
    colors: [Color(0xFF08D7FF), Color(0xFF7C3AED)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
