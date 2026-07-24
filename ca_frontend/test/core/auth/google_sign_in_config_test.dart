import 'package:ca_frontend/core/auth/google_sign_in_config.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const webClientId = 'web-client.apps.googleusercontent.com';
  const iosClientId = 'ios-client.apps.googleusercontent.com';

  test('Web usa o mesmo Web Client ID como audience', () {
    final config = GoogleSignInConfig.resolve(
      googleClientId: webClientId,
      googleServerClientId: webClientId,
      isWeb: true,
      platform: TargetPlatform.android,
    );

    expect(config.isValid, isTrue);
    expect(config.clientId, webClientId);
    expect(config.serverClientId, webClientId);
  });

  test('Web recusa client IDs divergentes', () {
    final config = GoogleSignInConfig.resolve(
      googleClientId: webClientId,
      googleServerClientId: 'outro-client.apps.googleusercontent.com',
      isWeb: true,
      platform: TargetPlatform.android,
    );

    expect(config.isValid, isFalse);
    expect(config.error, contains('deve ser igual'));
  });

  test('Android exige somente o Web Client ID de servidor', () {
    final config = GoogleSignInConfig.resolve(
      googleClientId: '',
      googleServerClientId: webClientId,
      isWeb: false,
      platform: TargetPlatform.android,
    );

    expect(config.isValid, isTrue);
    expect(config.clientId, isNull);
    expect(config.serverClientId, webClientId);
  });

  test('iOS mantém o Client ID nativo e usa Web Client ID como audience', () {
    final config = GoogleSignInConfig.resolve(
      googleClientId: iosClientId,
      googleServerClientId: webClientId,
      isWeb: false,
      platform: TargetPlatform.iOS,
    );

    expect(config.isValid, isTrue);
    expect(config.clientId, iosClientId);
    expect(config.serverClientId, webClientId);
  });

  test('configuração ausente mostra erro acionável', () {
    final config = GoogleSignInConfig.resolve(
      googleClientId: '',
      googleServerClientId: '',
      isWeb: false,
      platform: TargetPlatform.android,
    );

    expect(config.isValid, isFalse);
    expect(config.error, contains('GOOGLE_SERVER_CLIENT_ID'));
  });
}
