import 'package:flutter/material.dart';

import '../../../core/theme/adaptive_colors.dart';

/// Botão de login com Google.
class SocialLoginButtons extends StatelessWidget {
  const SocialLoginButtons({
    super.key,
    this.onGoogleTap,
    this.googleButton,
    this.enabled = true,
  });

  final VoidCallback? onGoogleTap;
  final Widget? googleButton;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return googleButton ??
        _SocialButton(
          icon: Icons.g_mobiledata_rounded,
          label: 'Continuar com Google',
          onTap: enabled ? onGoogleTap : null,
        );
  }
}

class _SocialButton extends StatelessWidget {
  const _SocialButton({
    required this.icon,
    required this.label,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final isEnabled = onTap != null;

    return Semantics(
      button: true,
      enabled: isEnabled,
      label: label,
      onTap: onTap,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          excludeFromSemantics: true,
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: ExcludeSemantics(
            child: AnimatedOpacity(
              duration: const Duration(milliseconds: 200),
              opacity: isEnabled ? 1 : 0.5,
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: context.appPanel,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: context.appBorder),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(icon, color: context.appTextPrimary, size: 24),
                    const SizedBox(width: 10),
                    Text(
                      label,
                      style: TextStyle(
                        color: context.appTextPrimary,
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
