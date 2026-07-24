import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/adaptive_colors.dart';

/// Checkbox obrigatório de consentimento legal (LGPD/GDPR).
class LegalConsentCheckbox extends StatelessWidget {
  const LegalConsentCheckbox({
    super.key,
    required this.value,
    required this.onChanged,
    this.errorText,
    this.onTermsTap,
    this.onPrivacyTap,
  });

  final bool value;
  final ValueChanged<bool?> onChanged;
  final String? errorText;
  final VoidCallback? onTermsTap;
  final VoidCallback? onPrivacyTap;

  @override
  Widget build(BuildContext context) {
    final errorColor = Theme.of(context).colorScheme.error;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 24,
              height: 24,
              child: Semantics(
                label: 'Aceito os Termos de Uso e a Politica de Privacidade',
                checked: value,
                onTap: () => onChanged(!value),
                child: Checkbox(
                  value: value,
                  onChanged: onChanged,
                  activeColor: context.appBrand,
                  checkColor: context.appOnBrand,
                  side: BorderSide(
                    color: errorText != null ? errorColor : context.appBorder,
                  ),
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(top: 2),
                child: RichText(
                  text: TextSpan(
                    style: TextStyle(
                      color: context.appTextSecondary,
                      fontSize: 13,
                      height: 1.4,
                    ),
                    children: [
                      const TextSpan(text: 'Aceito os '),
                      TextSpan(
                        text: 'Termos de Uso',
                        style: TextStyle(
                          color: context.appBrand,
                          fontWeight: FontWeight.w600,
                          decoration: TextDecoration.underline,
                        ),
                        recognizer: TapGestureRecognizer()..onTap = onTermsTap,
                      ),
                      const TextSpan(text: ' e a '),
                      TextSpan(
                        text: 'Política de Privacidade',
                        style: TextStyle(
                          color: context.appBrand,
                          fontWeight: FontWeight.w600,
                          decoration: TextDecoration.underline,
                        ),
                        recognizer: TapGestureRecognizer()
                          ..onTap = onPrivacyTap,
                      ),
                      const TextSpan(text: '.'),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
        if (errorText != null) ...[
          const SizedBox(height: 6),
          Padding(
            padding: const EdgeInsets.only(left: 34),
            child: Text(
              errorText!,
              style: TextStyle(
                color: errorColor,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ],
    );
  }
}
