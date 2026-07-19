import 'package:flutter/material.dart';

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

  static const Color _fillColor = Color(0xFF1E293B);
  static const Color _errorColor = Color(0xFFEF4444);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) ...[
          ExcludeSemantics(
            child: Text(
              label!,
              style: const TextStyle(color: Colors.white70, fontSize: 12),
            ),
          ),
          const SizedBox(height: 8),
        ],
        Semantics(
          label: label ?? hint,
          child: TextFormField(
            controller: controller,
            keyboardType: keyboardType,
            maxLines: maxLines,
            obscureText: obscureText,
            validator: validator,
            onChanged: onChanged,
            textInputAction: textInputAction,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: const TextStyle(color: Colors.white70),
              prefixIcon:
                  icon != null ? Icon(icon, color: Colors.white70) : null,
              suffixIcon: suffixIcon,
              filled: true,
              fillColor: _fillColor,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 14,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(
                  color: Color(0xFF3B82F6),
                  width: 1.5,
                ),
              ),
              errorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: _errorColor, width: 1.5),
              ),
              focusedErrorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: _errorColor, width: 1.5),
              ),
              errorStyle: const TextStyle(
                color: _errorColor,
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
        color: Colors.white54,
      ),
      onPressed: onToggle,
      tooltip: obscure ? 'Mostrar senha' : 'Ocultar senha',
    );
  }
}
