import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../config/api_config.dart';
import 'api_exceptions.dart';
import 'auth_interceptor.dart';

/// Cliente HTTP centralizado com interceptors para JWT e erros globais.
class DioClient {
  DioClient({
    required TokenProvider tokenProvider,
    OnUnauthorized? onUnauthorized,
    Dio? dio,
  }) : _dio = dio ??
            Dio(
              BaseOptions(
                baseUrl: ApiConfig.baseUrl,
                connectTimeout: ApiConfig.connectTimeout,
                receiveTimeout: ApiConfig.receiveTimeout,
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
              ),
            ) {
    if (kDebugMode) {
      debugPrint('[DIO] baseUrl=${ApiConfig.baseUrl}');
    }

    _dio.interceptors.addAll([
      AuthInterceptor(
        tokenProvider: tokenProvider,
        onUnauthorized: onUnauthorized,
      ),
      if (kDebugMode)
        LogInterceptor(
          requestBody: true,
          responseBody: true,
          logPrint: (o) => debugPrint('[DIO] $o'),
        ),
      InterceptorsWrapper(
        onError: (error, handler) {
          handler.reject(_mapError(error));
        },
      ),
    ]);
  }

  final Dio _dio;

  Dio get instance => _dio;

  DioException _mapError(DioException error) {
    final response = error.response;
    final status = response?.statusCode;
    final data = response?.data;
    String message = 'Erro inesperado.';

    if (data is Map && data['erro'] != null) {
      message = data['erro'].toString();
    } else if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.connectionError) {
      message = 'Sem conexão com o servidor.';
    }

    switch (status) {
      case 401:
        return DioException(
          requestOptions: error.requestOptions,
          response: response,
          type: error.type,
          error: UnauthorizedException(message: message),
        );
      case 403:
        return DioException(
          requestOptions: error.requestOptions,
          response: response,
          type: error.type,
          error: ForbiddenException(message: message),
        );
      case 500:
        return DioException(
          requestOptions: error.requestOptions,
          response: response,
          type: error.type,
          error: ServerException(message: message),
        );
      default:
        if (error.type == DioExceptionType.connectionError) {
          return DioException(
            requestOptions: error.requestOptions,
            type: error.type,
            error: NetworkException(message: message),
          );
        }
        return DioException(
          requestOptions: error.requestOptions,
          response: response,
          type: error.type,
          error: ApiException(message: message, statusCode: status),
        );
    }
  }

  static Object unwrapError(Object? error) {
    if (error is DioException && error.error != null) {
      return error.error!;
    }
    return error ?? const ApiException(message: 'Erro desconhecido.');
  }
}
