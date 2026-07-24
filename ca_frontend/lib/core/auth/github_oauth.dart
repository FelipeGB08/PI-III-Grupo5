import 'dart:math';

const githubOAuthCallbackScheme = 'conecta-amauc-auth';

String criarGithubOAuthState({Random? random}) {
  final source = random ?? Random.secure();
  const caracteres =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
  return List<String>.generate(
    48,
    (_) => caracteres[source.nextInt(caracteres.length)],
  ).join();
}

class GithubOAuthCallback {
  const GithubOAuthCallback({
    required this.ticket,
    required this.state,
  });

  final String ticket;
  final String state;

  factory GithubOAuthCallback.parse({
    required String callbackUrl,
    required String expectedState,
    bool allowWebCallback = false,
    String? expectedWebOrigin,
  }) {
    final uri = Uri.tryParse(callbackUrl);
    final esquemaAceito = uri?.scheme == githubOAuthCallbackScheme ||
        (allowWebCallback && uri?.scheme == 'https');
    if (uri == null || !esquemaAceito) {
      throw StateError('Retorno do login GitHub invalido.');
    }

    if (uri.scheme == 'https' &&
        expectedWebOrigin != null &&
        uri.origin != expectedWebOrigin) {
      throw StateError('Retorno do login GitHub veio de uma origem invalida.');
    }

    final erro = uri.queryParameters['error']?.trim();
    if (erro != null && erro.isNotEmpty) {
      throw StateError(erro);
    }

    final state = uri.queryParameters['state']?.trim() ?? '';
    final ticket = uri.queryParameters['ticket']?.trim() ?? '';
    if (state != expectedState || ticket.isEmpty) {
      throw StateError('Retorno do login GitHub invalido ou expirado.');
    }
    return GithubOAuthCallback(ticket: ticket, state: state);
  }
}
