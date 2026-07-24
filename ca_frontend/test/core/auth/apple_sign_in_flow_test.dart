import 'package:ca_frontend/core/auth/apple_sign_in_flow.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('validateAppleCredentialState', () {
    test('aceita o state devolvido pelo plugin quando corresponde ao servidor',
        () {
      expect(
        () => validateAppleCredentialState(
          expectedState: 'estado-opaco-123456',
          returnedState: 'estado-opaco-123456',
        ),
        returnsNormally,
      );
    });

    test('recusa state ausente ou diferente', () {
      expect(
        () => validateAppleCredentialState(
          expectedState: 'estado-opaco-123456',
          returnedState: null,
        ),
        throwsA(isA<StateError>()),
      );
      expect(
        () => validateAppleCredentialState(
          expectedState: 'estado-opaco-123456',
          returnedState: 'estado-atacante-1234',
        ),
        throwsA(isA<StateError>()),
      );
    });
  });
}
