import 'dart:convert';
import 'dart:typed_data';

import 'package:ca_frontend/data/datasources/local/token_storage.dart';
import 'package:ca_frontend/data/datasources/remote/api_service.dart';
import 'package:ca_frontend/data/repositories/auth_repository_impl.dart';
import 'package:ca_frontend/domain/repositories/auth_repository.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _MemorySecureTokenStore implements SecureTokenStore {
  final Map<String, String> values = {};

  @override
  Future<void> delete(String key) async => values.remove(key);

  @override
  Future<String?> read(String key) async => values[key];

  @override
  Future<void> write(String key, String value) async {
    values[key] = value;
  }
}

class _FailingLogoutAdapter implements HttpClientAdapter {
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return ResponseBody.fromString(
      jsonEncode({'erro': 'Servidor indisponível.'}),
      503,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

class _SuccessAdapter implements HttpClientAdapter {
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return ResponseBody.fromString('', 204);
  }

  @override
  void close({bool force = false}) {}
}

class _FailingDeleteSecureTokenStore extends _MemorySecureTokenStore {
  @override
  Future<void> delete(String key) async {
    throw StateError('Cofre indisponivel');
  }
}

void main() {
  test('logout informa falha remota, mas remove tokens locais', () async {
    SharedPreferences.setMockInitialValues({
      'auth_user': '{"id":1}',
      'chamados_cliente_cache': '[]',
    });
    final prefs = await SharedPreferences.getInstance();
    final secureStore = _MemorySecureTokenStore();
    final storage = TokenStorage(prefs, secureTokenStore: secureStore);
    await storage.initialize();
    await storage.saveToken('access-token');
    await storage.saveRefreshToken('refresh-token');

    final dio = Dio(BaseOptions(baseUrl: 'http://teste.local'))
      ..httpClientAdapter = _FailingLogoutAdapter();
    final repository = AuthRepositoryImpl(ApiService(dio), storage);

    await expectLater(repository.logout(), throwsA(isA<DioException>()));

    expect(storage.getToken(), isNull);
    expect(storage.getRefreshToken(), isNull);
    expect(secureStore.values, isEmpty);
    expect(prefs.containsKey('auth_user'), isFalse);
    expect(prefs.containsKey('chamados_cliente_cache'), isFalse);
  });

  test('exclusao confirmada distingue falha posterior de limpeza local',
      () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final storage = TokenStorage(
      prefs,
      secureTokenStore: _FailingDeleteSecureTokenStore(),
    );
    await storage.initialize();
    await storage.saveToken('access-token');

    final dio = Dio(BaseOptions(baseUrl: 'http://teste.local'))
      ..httpClientAdapter = _SuccessAdapter();
    final repository = AuthRepositoryImpl(ApiService(dio), storage);

    await expectLater(
      repository.deleteAccount(confirmation: 'EXCLUIR MINHA CONTA'),
      throwsA(isA<AccountDeletedWithLocalCleanupFailure>()),
    );

    expect(storage.getToken(), isNull);
  });
}
