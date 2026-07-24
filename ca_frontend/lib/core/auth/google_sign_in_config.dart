import 'package:flutter/foundation.dart';

/// Valores públicos usados pelo plugin do Google Sign-In.
///
/// O ID de servidor é o Web Client ID cujo `aud` deve ser aceito pelo
/// backend. Nenhum client secret faz parte desta configuração.
class GoogleSignInConfig {
  const GoogleSignInConfig._({
    this.clientId,
    this.serverClientId,
    this.error,
  });

  final String? clientId;
  final String? serverClientId;
  final String? error;

  bool get isValid => error == null;

  factory GoogleSignInConfig.resolve({
    required String googleClientId,
    required String googleServerClientId,
    required bool isWeb,
    required TargetPlatform platform,
  }) {
    final clientId = googleClientId.trim();
    final serverClientId = googleServerClientId.trim();

    if (isWeb) {
      if (!_isGoogleClientId(clientId)) {
        return const GoogleSignInConfig._(
          error: 'Configure GOOGLE_CLIENT_ID com o Web Client ID do Google.',
        );
      }
      if (serverClientId.isNotEmpty && serverClientId != clientId) {
        return const GoogleSignInConfig._(
          error:
              'No navegador, GOOGLE_SERVER_CLIENT_ID deve ser igual a GOOGLE_CLIENT_ID.',
        );
      }
      return GoogleSignInConfig._(
        clientId: clientId,
        // No navegador o próprio Web Client ID determina o audience do token.
        serverClientId: serverClientId.isEmpty ? null : serverClientId,
      );
    }

    if (!_isGoogleClientId(serverClientId)) {
      return const GoogleSignInConfig._(
        error:
            'Configure GOOGLE_SERVER_CLIENT_ID com o Web Client ID aceito pela API.',
      );
    }

    if ((platform == TargetPlatform.iOS || platform == TargetPlatform.macOS) &&
        clientId.isNotEmpty &&
        !_isGoogleClientId(clientId)) {
      return const GoogleSignInConfig._(
        error: 'GOOGLE_CLIENT_ID precisa ser um Client ID válido do Google.',
      );
    }

    return GoogleSignInConfig._(
      // Android usa a configuração nativa do Google Services. iOS/macOS podem
      // usar o Client ID específico da plataforma quando ele for informado.
      clientId: (platform == TargetPlatform.iOS ||
                  platform == TargetPlatform.macOS) &&
              clientId.isNotEmpty
          ? clientId
          : null,
      serverClientId: serverClientId,
    );
  }

  static bool _isGoogleClientId(String value) =>
      RegExp(r'^[A-Za-z0-9-]+\.apps\.googleusercontent\.com$').hasMatch(value);
}
