import 'package:dio/dio.dart';

import '../config/api_config.dart';

typedef TokenProvider = String? Function();
typedef TokenSaver = Future<void> Function(String token);
typedef SessionClearer = Future<void> Function();
typedef OnUnauthorized = void Function();

/// Injeta o access token e renova a sessao uma unica vez ao receber 401.
class AuthInterceptor extends Interceptor {
  AuthInterceptor({
    required Dio dio,
    required this.tokenProvider,
    required this.refreshTokenProvider,
    required this.tokenSaver,
    required this.sessionClearer,
    this.onUnauthorized,
    Dio? refreshDio,
  })  : _dio = dio,
        _refreshDio = refreshDio ??
            Dio(
              BaseOptions(
                baseUrl: dio.options.baseUrl,
                connectTimeout: dio.options.connectTimeout,
                receiveTimeout: dio.options.receiveTimeout,
                sendTimeout: dio.options.sendTimeout,
                headers: Map<String, dynamic>.from(dio.options.headers),
              ),
            ) {
    _refreshDio.options.headers.remove('Authorization');
  }

  final Dio _dio;
  final Dio _refreshDio;
  final TokenProvider tokenProvider;
  final TokenProvider refreshTokenProvider;
  final TokenSaver tokenSaver;
  final SessionClearer sessionClearer;
  final OnUnauthorized? onUnauthorized;

  Future<String?>? _refreshing;

  static const _retryKey = 'retried_after_refresh';
  static const _publicPaths = [
    '/api/auth/register',
    '/api/auth/login',
    '/api/auth/social-login',
    '/api/auth/apple/config',
    '/api/auth/github/authorize',
    '/api/auth/github/callback',
    '/api/auth/github/complete',
    '/api/auth/refresh',
    '/api/auth/logout',
    '/api/auth/magic-link',
    '/api/auth/password-reset',
    '/api/usuarios/registro',
    '/api/usuarios/login',
    '/api/profissionais',
    '/api/categorias',
    '/api/status',
    '/api/avaliacoes/profissional',
  ];

  bool _isPublic(RequestOptions options) {
    final path = options.path.replaceFirst(
      RegExp(r'^/api/v1(?=/|$)'),
      '/api',
    );
    return _publicPaths.any((publicPath) => path.startsWith(publicPath));
  }

  bool _isTrustedApi(RequestOptions options) {
    final target = options.uri;
    final api = Uri.tryParse(_dio.options.baseUrl);
    if (api == null) return false;
    int port(Uri uri) => uri.hasPort
        ? uri.port
        : (uri.scheme.toLowerCase() == 'https' ? 443 : 80);
    return target.scheme.toLowerCase() == api.scheme.toLowerCase() &&
        target.host.toLowerCase() == api.host.toLowerCase() &&
        port(target) == port(api);
  }

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (_isTrustedApi(options) && !_isPublic(options)) {
      final token = tokenProvider();
      if (token != null && token.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final request = err.requestOptions;
    final podeRenovar = err.response?.statusCode == 401 &&
        _isTrustedApi(request) &&
        !_isPublic(request) &&
        request.extra[_retryKey] != true;

    if (!podeRenovar) {
      handler.next(err);
      return;
    }

    final refreshToken = refreshTokenProvider();
    if (refreshToken == null || refreshToken.isEmpty) {
      await sessionClearer();
      onUnauthorized?.call();
      handler.next(err);
      return;
    }

    final novoAccessToken = await _renovarAccessToken(refreshToken);
    if (novoAccessToken == null) {
      handler.next(err);
      return;
    }

    request.headers['Authorization'] = 'Bearer $novoAccessToken';
    request.extra[_retryKey] = true;
    if (request.data is FormData) {
      request.data = (request.data as FormData).clone();
    }

    try {
      final response = await _dio.fetch<dynamic>(request);
      handler.resolve(response);
    } on DioException catch (retryError) {
      handler.next(retryError);
    }
  }

  Future<String?> _renovarAccessToken(String refreshToken) async {
    final renovacaoAtual = _refreshing;
    if (renovacaoAtual != null) return renovacaoAtual;

    final renovacao = _executarRefresh(refreshToken);
    _refreshing = renovacao;

    try {
      return await renovacao;
    } finally {
      if (identical(_refreshing, renovacao)) {
        _refreshing = null;
      }
    }
  }

  Future<String?> _executarRefresh(String refreshToken) async {
    try {
      final response = await _refreshDio.post<Map<String, dynamic>>(
        ApiConfig.authRefresh,
        data: {'refresh_token': refreshToken},
      );
      final data = response.data;
      final accessToken =
          data?['access_token']?.toString() ?? data?['token']?.toString();

      if (accessToken == null || accessToken.isEmpty) {
        throw StateError('Resposta de refresh sem access token.');
      }

      await tokenSaver(accessToken);
      return accessToken;
    } catch (_) {
      await sessionClearer();
      onUnauthorized?.call();
      return null;
    }
  }
}
