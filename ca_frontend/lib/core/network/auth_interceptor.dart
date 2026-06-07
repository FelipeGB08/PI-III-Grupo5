import 'package:dio/dio.dart';

typedef TokenProvider = String? Function();
typedef OnUnauthorized = void Function();

/// Injeta automaticamente o JWT Bearer nas requisições protegidas.
class AuthInterceptor extends Interceptor {
  AuthInterceptor({
    required this.tokenProvider,
    this.onUnauthorized,
  });

  final TokenProvider tokenProvider;
  final OnUnauthorized? onUnauthorized;

  static const _publicPaths = [
    '/api/usuarios/registro',
    '/api/usuarios/login',
    '/api/profissionais',
    '/api/categorias',
    '/api/status',
    '/api/avaliacoes/profissional',
  ];

  bool _isPublic(RequestOptions options) {
    final path = options.path;
    return _publicPaths.any((p) => path.startsWith(p));
  }

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (!_isPublic(options)) {
      final token = tokenProvider();
      if (token != null && token.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final status = err.response?.statusCode;
    if (status == 401) {
      onUnauthorized?.call();
    }
    handler.next(err);
  }
}
