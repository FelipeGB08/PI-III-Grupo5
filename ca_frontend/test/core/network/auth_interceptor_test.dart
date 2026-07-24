import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:ca_frontend/core/network/auth_interceptor.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

class _StubAdapter implements HttpClientAdapter {
  _StubAdapter(this.handler);

  final Future<ResponseBody> Function(RequestOptions options) handler;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) {
    return handler(options);
  }

  @override
  void close({bool force = false}) {}
}

ResponseBody _jsonResponse(int status, Map<String, dynamic> data) {
  return ResponseBody.fromString(
    jsonEncode(data),
    status,
    headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    },
  );
}

void main() {
  test('renova access token ao receber 401 e repete a requisicao', () async {
    var accessToken = 'access-expirado';
    const refreshToken = 'refresh-opaco';
    var chamadasProtegidas = 0;
    var chamadasRefresh = 0;
    Map<String, dynamic>? bodyRefresh;

    final dio = Dio(BaseOptions(baseUrl: 'http://teste.local'));
    dio.httpClientAdapter = _StubAdapter((options) async {
      chamadasProtegidas++;
      if (options.headers['Authorization'] == 'Bearer access-renovado') {
        return _jsonResponse(200, {'ok': true});
      }
      return _jsonResponse(401, {'erro': 'Token expirado.'});
    });

    final refreshDio = Dio(BaseOptions(baseUrl: 'http://teste.local'));
    refreshDio.httpClientAdapter = _StubAdapter((options) async {
      chamadasRefresh++;
      bodyRefresh = Map<String, dynamic>.from(options.data as Map);
      return _jsonResponse(200, {'access_token': 'access-renovado'});
    });

    dio.interceptors.add(
      AuthInterceptor(
        dio: dio,
        refreshDio: refreshDio,
        tokenProvider: () => accessToken,
        refreshTokenProvider: () => refreshToken,
        tokenSaver: (token) async => accessToken = token,
        sessionClearer: () async {},
      ),
    );

    final response = await dio.get<Map<String, dynamic>>('/api/protegido');

    expect(response.data, {'ok': true});
    expect(accessToken, 'access-renovado');
    expect(bodyRefresh, {'refresh_token': refreshToken});
    expect(chamadasRefresh, 1);
    expect(chamadasProtegidas, 2);
  });

  test('limpa a sessao quando o refresh token e rejeitado', () async {
    var limpouSessao = false;
    var notificou = false;

    final dio = Dio(BaseOptions(baseUrl: 'http://teste.local'));
    dio.httpClientAdapter = _StubAdapter(
      (_) async => _jsonResponse(401, {'erro': 'Token expirado.'}),
    );

    final refreshDio = Dio(BaseOptions(baseUrl: 'http://teste.local'));
    refreshDio.httpClientAdapter = _StubAdapter(
      (_) async => _jsonResponse(401, {'erro': 'Refresh token revogado.'}),
    );

    dio.interceptors.add(
      AuthInterceptor(
        dio: dio,
        refreshDio: refreshDio,
        tokenProvider: () => 'access-expirado',
        refreshTokenProvider: () => 'refresh-revogado',
        tokenSaver: (_) async {},
        sessionClearer: () async => limpouSessao = true,
        onUnauthorized: () => notificou = true,
      ),
    );

    await expectLater(
      dio.get<Map<String, dynamic>>('/api/protegido'),
      throwsA(isA<DioException>()),
    );
    expect(limpouSessao, isTrue);
    expect(notificou, isTrue);
  });

  test('compartilha um único refresh entre requisicoes 401 concorrentes',
      () async {
    var accessToken = 'access-expirado';
    var chamadasRefresh = 0;
    final liberarRefresh = Completer<void>();

    final dio = Dio(BaseOptions(baseUrl: 'http://teste.local'));
    dio.httpClientAdapter = _StubAdapter((options) async {
      if (options.headers['Authorization'] == 'Bearer access-renovado') {
        return _jsonResponse(200, {'path': options.path});
      }
      return _jsonResponse(401, {'erro': 'Token expirado.'});
    });

    final refreshDio = Dio(BaseOptions(baseUrl: 'http://teste.local'));
    refreshDio.httpClientAdapter = _StubAdapter((_) async {
      chamadasRefresh++;
      await liberarRefresh.future;
      return _jsonResponse(200, {'access_token': 'access-renovado'});
    });

    dio.interceptors.add(
      AuthInterceptor(
        dio: dio,
        refreshDio: refreshDio,
        tokenProvider: () => accessToken,
        refreshTokenProvider: () => 'refresh-opaco',
        tokenSaver: (token) async => accessToken = token,
        sessionClearer: () async {},
      ),
    );

    final respostas = Future.wait([
      dio.get<Map<String, dynamic>>('/api/protegido/um'),
      dio.get<Map<String, dynamic>>('/api/protegido/dois'),
    ]);

    // Deixa as duas respostas 401 alcançarem o interceptor antes de liberar
    // a resposta do refresh em comum.
    await Future<void>.delayed(const Duration(milliseconds: 20));
    expect(chamadasRefresh, 1);

    liberarRefresh.complete();
    final resultado = await respostas;

    expect(resultado, hasLength(2));
    expect(chamadasRefresh, 1);
    expect(accessToken, 'access-renovado');
  });
}
