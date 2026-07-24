import 'package:ca_frontend/data/datasources/remote/api_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AppleSignInConfiguration', () {
    test('aceita configuracao Android entregue pelo backend', () {
      final config = AppleSignInConfiguration.fromJson(
        {
          'client_id': 'com.amauc.conecta.web',
          'redirect_uri': 'https://app.example.test/',
          'state': 'estado-opaco-123456',
          'nonce': 'nonce-opaco-1234567',
        },
        platform: 'android',
      );

      expect(config.clientId, 'com.amauc.conecta.web');
      expect(config.redirectUri, 'https://app.example.test/');
      expect(config.state, 'estado-opaco-123456');
      expect(config.nonce, 'nonce-opaco-1234567');
    });

    test('iOS nao exige redirect URI, mas exige state e nonce', () {
      final config = AppleSignInConfiguration.fromJson(
        {
          'client_id': 'com.amauc.conecta',
          'state': 'estado-opaco-123456',
          'nonce': 'nonce-opaco-1234567',
        },
        platform: 'ios',
      );

      expect(config.redirectUri, isNull);
    });

    test('recusa Android sem redirect URI', () {
      expect(
        () => AppleSignInConfiguration.fromJson(
          {
            'client_id': 'com.amauc.conecta.web',
            'state': 'estado-opaco-123456',
            'nonce': 'nonce-opaco-1234567',
          },
          platform: 'android',
        ),
        throwsA(isA<StateError>()),
      );
    });

    test('recusa state ou nonce ausentes, curtos ou manipulaveis', () {
      expect(
        () => AppleSignInConfiguration.fromJson(
          {
            'client_id': 'com.amauc.conecta',
            'state': '../state-invalido',
            'nonce': 'curto',
          },
          platform: 'ios',
        ),
        throwsA(isA<StateError>()),
      );
    });
  });
}
