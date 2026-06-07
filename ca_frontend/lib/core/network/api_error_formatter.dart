import 'package:dio/dio.dart';

import 'api_exceptions.dart';
import 'dio_client.dart';

/// Extrai mensagem legível de erros Dio/API para exibir na UI.
String formatApiError(Object error) {
  if (error is ApiException) return error.message;
  if (error is DioException) {
    final inner = DioClient.unwrapError(error);
    if (inner is ApiException) return inner.message;
    return inner.toString();
  }
  return error.toString();
}
