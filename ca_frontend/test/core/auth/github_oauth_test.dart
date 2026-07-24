import 'dart:math';

import 'package:ca_frontend/core/auth/github_oauth.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('GithubOAuthCallback', () {
    test('gera state aleatorio com formato seguro', () {
      final state = criarGithubOAuthState(random: Random(7));

      expect(state, hasLength(48));
      expect(state, matches(RegExp(r'^[A-Za-z0-9_-]+$')));
    });

    test('aceita callback nativo somente com ticket e state esperado', () {
      final state = List.filled(48, 'a').join();
      final callback = GithubOAuthCallback.parse(
        callbackUrl:
            '$githubOAuthCallbackScheme://github?ticket=ticket-123&state=$state',
        expectedState: state,
      );

      expect(callback.ticket, 'ticket-123');
      expect(callback.state, state);
    });

    test('rejeita state divergente, ticket ausente e callback de outro esquema',
        () {
      final state = List.filled(48, 'a').join();

      expect(
        () => GithubOAuthCallback.parse(
          callbackUrl:
              '$githubOAuthCallbackScheme://github?ticket=ticket&state=outro',
          expectedState: state,
        ),
        throwsA(isA<StateError>()),
      );
      expect(
        () => GithubOAuthCallback.parse(
          callbackUrl: '$githubOAuthCallbackScheme://github?state=$state',
          expectedState: state,
        ),
        throwsA(isA<StateError>()),
      );
      expect(
        () => GithubOAuthCallback.parse(
          callbackUrl:
              'https://atacante.example/auth.html?ticket=ticket&state=$state',
          expectedState: state,
        ),
        throwsA(isA<StateError>()),
      );
      expect(
        () => GithubOAuthCallback.parse(
          callbackUrl:
              'https://atacante.example/auth.html?ticket=ticket&state=$state',
          expectedState: state,
          allowWebCallback: true,
          expectedWebOrigin: 'https://app.example',
        ),
        throwsA(isA<StateError>()),
      );
    });

    test('propaga cancelamento recebido pelo callback web', () {
      final state = List.filled(48, 'a').join();

      expect(
        () => GithubOAuthCallback.parse(
          callbackUrl:
              'https://app.example/auth.html?error=Login+GitHub+cancelado.&state=$state',
          expectedState: state,
          allowWebCallback: true,
        ),
        throwsA(isA<StateError>()),
      );
    });
  });
}
