import 'package:flutter/material.dart';

import '../../../core/theme/adaptive_colors.dart';

/// Campo de texto estilizado para telas de autenticação com feedback de erro.
class AuthTextField extends StatelessWidget {
  const AuthTextField({
    super.key,
    required this.controller,
    this.label,
    this.hint,
    this.icon,
    this.keyboardType,
    this.maxLines = 1,
    this.obscureText = false,
    this.suffixIcon,
    this.validator,
    this.onChanged,
    this.textInputAction,
  });

  final TextEditingController controller;
  final String? label;
  final String? hint;
  final IconData? icon;
  final TextInputType? keyboardType;
  final int maxLines;
  final bool obscureText;
  final Widget? suffixIcon;
  final String? Function(String?)? validator;
  final ValueChanged<String>? onChanged;
  final TextInputAction? textInputAction;

  @override
  Widget build(BuildContext context) {
    final errorColor = Theme.of(context).colorScheme.error;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) ...[
          ExcludeSemantics(
            child: Text(
              label!,
              style: TextStyle(color: context.appTextSecondary, fontSize: 12),
            ),
          ),
          const SizedBox(height: 8),
        ],
        Semantics(
          label: label ?? hint,
          hint: obscureText ? 'Campo de senha protegido' : hint,
          textField: true,
          child: TextFormField(
            controller: controller,
            keyboardType: keyboardType,
            maxLines: maxLines,
            obscureText: obscureText,
            validator: validator,
            onChanged: onChanged,
            textInputAction: textInputAction,
            style: TextStyle(color: context.appTextPrimary),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: TextStyle(color: context.appMuted),
              prefixIcon:
                  icon != null ? Icon(icon, color: context.appMuted) : null,
              suffixIcon: suffixIcon,
              filled: true,
              fillColor: context.appPanel,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 14,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: context.appBorder),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: context.appBorder),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: context.appBrand,
                  width: 1.5,
                ),
              ),
              errorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: errorColor, width: 1.5),
              ),
              focusedErrorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: errorColor, width: 1.5),
              ),
              errorStyle: TextStyle(
                color: errorColor,
                fontSize: 12,
                height: 1.2,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// Toggle de visibilidade de senha reutilizável.
class PasswordVisibilityToggle extends StatelessWidget {
  const PasswordVisibilityToggle({
    super.key,
    required this.obscure,
    required this.onToggle,
  });

  final bool obscure;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: Icon(
        obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined,
        color: context.appMuted,
      ),
      onPressed: onToggle,
      tooltip: obscure ? 'Mostrar senha' : 'Ocultar senha',
    );
  }
}
