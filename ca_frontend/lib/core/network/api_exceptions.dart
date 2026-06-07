class ApiException implements Exception {
  const ApiException({
    required this.message,
    this.statusCode,
    this.originalError,
  });

  final String message;
  final int? statusCode;
  final Object? originalError;

  @override
  String toString() => 'ApiException($statusCode): $message';
}

class UnauthorizedException extends ApiException {
  const UnauthorizedException({super.message = 'Sessão expirada. Faça login novamente.'})
      : super(statusCode: 401);
}

class ForbiddenException extends ApiException {
  const ForbiddenException({super.message = 'Acesso negado.'}) : super(statusCode: 403);
}

class ServerException extends ApiException {
  const ServerException({super.message = 'Erro interno do servidor.'}) : super(statusCode: 500);
}

class NetworkException extends ApiException {
  const NetworkException({super.message = 'Sem conexão com o servidor.'});
}
