void validateAppleCredentialState({
  required String expectedState,
  required String? returnedState,
}) {
  if (returnedState == null || returnedState != expectedState) {
    throw StateError(
      'O retorno do login Apple nao corresponde a solicitacao iniciada.',
    );
  }
}
