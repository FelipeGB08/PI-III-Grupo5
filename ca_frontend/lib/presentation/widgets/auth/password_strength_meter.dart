import 'package:flutter/material.dart';

/// Níveis de força da senha para feedback visual.
enum PasswordStrength {
  empty,
  weak,
  fair,
  good,
  strong,
}

/// Calcula a força da senha com base em comprimento e diversidade de caracteres.
class PasswordStrengthCalculator {
  PasswordStrengthCalculator._();

  static PasswordStrength evaluate(String password) {
    if (password.isEmpty) return PasswordStrength.empty;

    var score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (password.length >= 10) score++;
    if (RegExp(r'[A-Z]').hasMatch(password)) score++;
    if (RegExp(r'[a-z]').hasMatch(password)) score++;
    if (RegExp(r'[0-9]').hasMatch(password)) score++;
    if (RegExp(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;/`~]').hasMatch(password)) {
      score++;
    }

    if (score <= 2) return PasswordStrength.weak;
    if (score <= 4) return PasswordStrength.fair;
    if (score <= 6) return PasswordStrength.good;
    return PasswordStrength.strong;
  }

  static String label(PasswordStrength strength) {
    switch (strength) {
      case PasswordStrength.empty:
        return '';
      case PasswordStrength.weak:
        return 'Fraca';
      case PasswordStrength.fair:
        return 'Razoável';
      case PasswordStrength.good:
        return 'Boa';
      case PasswordStrength.strong:
        return 'Forte';
    }
  }

  static Color color(PasswordStrength strength) {
    switch (strength) {
      case PasswordStrength.empty:
        return Colors.transparent;
      case PasswordStrength.weak:
        return const Color(0xFFEF4444);
      case PasswordStrength.fair:
        return const Color(0xFFF59E0B);
      case PasswordStrength.good:
        return const Color(0xFF3B82F6);
      case PasswordStrength.strong:
        return const Color(0xFF22C55E);
    }
  }

  static int segmentCount(PasswordStrength strength) {
    switch (strength) {
      case PasswordStrength.empty:
        return 0;
      case PasswordStrength.weak:
        return 1;
      case PasswordStrength.fair:
        return 2;
      case PasswordStrength.good:
        return 3;
      case PasswordStrength.strong:
        return 4;
    }
  }
}

/// Medidor visual dinâmico de força de senha.
class PasswordStrengthMeter extends StatelessWidget {
  const PasswordStrengthMeter({
    super.key,
    required this.password,
  });

  final String password;

  static const int _totalSegments = 4;

  @override
  Widget build(BuildContext context) {
    final strength = PasswordStrengthCalculator.evaluate(password);
    if (strength == PasswordStrength.empty) {
      return const SizedBox.shrink();
    }

    final activeSegments = PasswordStrengthCalculator.segmentCount(strength);
    final color = PasswordStrengthCalculator.color(strength);
    final label = PasswordStrengthCalculator.label(strength);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        Row(
          children: List.generate(_totalSegments, (index) {
            final isActive = index < activeSegments;
            return Expanded(
              child: Container(
                height: 4,
                margin: EdgeInsets.only(right: index < _totalSegments - 1 ? 6 : 0),
                decoration: BoxDecoration(
                  color: isActive
                      ? color
                      : Colors.white.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            );
          }),
        ),
        const SizedBox(height: 6),
        Text(
          'Força da senha: $label',
          style: TextStyle(
            color: color,
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
