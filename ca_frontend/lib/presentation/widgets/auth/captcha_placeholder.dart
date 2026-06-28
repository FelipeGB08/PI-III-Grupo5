import 'package:flutter/material.dart';

/// Verificacao anti-bot local para o MVP.
///
/// A API atual valida rate limit no backend. Este componente evita envio
/// acidental do formulario sem uma acao explicita do usuario.
class CaptchaPlaceholderController {
  VoidCallback? _onReset;

  void _attach(VoidCallback onReset) {
    _onReset = onReset;
  }

  void _detach() {
    _onReset = null;
  }

  /// Marca a verificacao como concluida.
  void markVerified({String? token}) {
    // Mantem assinatura flexivel caso um provedor real seja conectado depois.
  }

  /// Reseta o estado de verificação.
  void reset() {
    _onReset?.call();
  }
}

class CaptchaPlaceholder extends StatefulWidget {
  const CaptchaPlaceholder({
    super.key,
    this.controller,
    this.onVerifiedChanged,
    this.providerLabel = 'Cloudflare Turnstile / reCAPTCHA v3',
  });

  final CaptchaPlaceholderController? controller;
  final ValueChanged<bool>? onVerifiedChanged;
  final String providerLabel;

  @override
  State<CaptchaPlaceholder> createState() => _CaptchaPlaceholderState();
}

class _CaptchaPlaceholderState extends State<CaptchaPlaceholder> {
  bool _isVerified = false;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    widget.controller?._attach(_reset);
  }

  @override
  void dispose() {
    widget.controller?._detach();
    super.dispose();
  }

  void _reset() {
    if (!mounted) return;
    setState(() {
      _isVerified = false;
      _isLoading = false;
    });
    widget.onVerifiedChanged?.call(false);
  }

  Future<void> _simulateVerification() async {
    if (_isVerified || _isLoading) return;

    setState(() => _isLoading = true);

    // Pequena latencia para dar feedback visual da verificacao.
    await Future<void>.delayed(const Duration(milliseconds: 600));

    if (!mounted) return;

    setState(() {
      _isLoading = false;
      _isVerified = true;
    });
    widget.controller?.markVerified();
    widget.onVerifiedChanged?.call(true);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _isVerified
              ? const Color(0xFF22C55E).withValues(alpha: 0.5)
              : Colors.white.withValues(alpha: 0.08),
        ),
      ),
      child: Row(
        children: [
          if (_isLoading)
            const SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Color(0xFF3B82F6),
              ),
            )
          else
            Icon(
              _isVerified
                  ? Icons.verified_user_outlined
                  : Icons.shield_outlined,
              color: _isVerified ? const Color(0xFF22C55E) : Colors.white54,
              size: 22,
            ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _isVerified
                      ? 'Verificação anti-bot concluída'
                      : 'Verificação anti-bot',
                  style: TextStyle(
                    color: _isVerified ? Colors.white : Colors.white70,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  widget.providerLabel,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.4),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          if (!_isVerified && !_isLoading)
            TextButton(
              onPressed: _simulateVerification,
              style: TextButton.styleFrom(
                foregroundColor: const Color(0xFF3B82F6),
                padding: const EdgeInsets.symmetric(horizontal: 12),
              ),
              child: const Text('Verificar', style: TextStyle(fontSize: 12)),
            ),
        ],
      ),
    );
  }
}
