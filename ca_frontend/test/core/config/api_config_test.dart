import 'package:ca_frontend/core/config/api_config.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('ApiConfig release', () {
    test('exige API_BASE_URL explícita', () {
      expect(
        () => ApiConfig.resolveBaseUrlForEnvironment(
          configured: '',
          isWeb: false,
          platform: TargetPlatform.android,
          isRelease: true,
        ),
        throwsA(isA<StateError>()),
      );
    });

    test('exige HTTPS', () {
      expect(
        () => ApiConfig.resolveBaseUrlForEnvironment(
          configured: 'http://api.example.test',
          isWeb: false,
          platform: TargetPlatform.android,
          isRelease: true,
        ),
        throwsA(isA<StateError>()),
      );
    });

    test('aceita somente uma origem HTTPS sem caminho ou credencial', () {
      expect(
        ApiConfig.resolveBaseUrlForEnvironment(
          configured: ' https://api.example.test/ ',
          isWeb: false,
          platform: TargetPlatform.android,
          isRelease: true,
        ),
        'https://api.example.test',
      );

      for (final invalid in [
        'https://usuario@api.example.test',
        'https://api.example.test/api',
        'https://api.example.test?ambiente=producao',
      ]) {
        expect(
          () => ApiConfig.resolveBaseUrlForEnvironment(
            configured: invalid,
            isWeb: false,
            platform: TargetPlatform.android,
            isRelease: true,
          ),
          throwsA(isA<StateError>()),
        );
      }
    });
  });

  test('debug Android mantém o backend do emulador', () {
    expect(
      ApiConfig.resolveBaseUrlForEnvironment(
        configured: '',
        isWeb: false,
        platform: TargetPlatform.android,
        isRelease: false,
      ),
      'http://10.0.2.2:3000',
    );
  });
}
