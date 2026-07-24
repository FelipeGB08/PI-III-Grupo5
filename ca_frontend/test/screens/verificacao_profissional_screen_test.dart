import 'dart:convert';
import 'dart:typed_data';

import 'package:ca_frontend/data/datasources/remote/api_service.dart';
import 'package:ca_frontend/presentation/providers/providers.dart';
import 'package:ca_frontend/presentation/screens/prestador/verificacao_profissional_screen.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _StubAdapter implements HttpClientAdapter {
  _StubAdapter(this.handler);

  final Future<ResponseBody> Function(RequestOptions options) handler;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) =>
      handler(options);

  @override
  void close({bool force = false}) {}
}

void main() {
  testWidgets('prestador visualiza status pendente de verificacao',
      (tester) async {
    final dio = Dio(BaseOptions(baseUrl: 'https://api.example.test'))
      ..httpClientAdapter = _StubAdapter((options) async {
        expect(options.path, '/api/v1/perfil/verificacao');
        return ResponseBody.fromString(
          jsonEncode({
            'verificacao': {
              'perfil_id': 8,
              'status_verificacao': 'pendente',
              'documento_disponivel': true,
              'enviado_em': '2030-01-02T10:00:00.000Z',
            },
          }),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          apiServiceProvider.overrideWithValue(ApiService(dio)),
        ],
        child: const MaterialApp(home: VerificacaoProfissionalScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Aguardando revisao'), findsOneWidget);
    expect(find.text('Documento em revisao'), findsOneWidget);
    expect(
        find.byKey(const Key('enviar-documento-verificacao')), findsOneWidget);
  });
}
