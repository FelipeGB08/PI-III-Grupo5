import 'dart:convert';
import 'dart:typed_data';

import 'package:ca_frontend/data/datasources/remote/api_service.dart';
import 'package:ca_frontend/presentation/providers/providers.dart';
import 'package:ca_frontend/presentation/screens/admin/admin_dashboard_screen.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _AdapterAdminDenuncias implements HttpClientAdapter {
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final body = switch (options.path) {
      '/api/v1/categorias' => [],
      '/api/v1/admin/relatorios' => {
          'demandas_por_municipio': [],
          'resumo_status': [],
        },
      '/api/v1/admin/verificacoes' => {'verificacoes': []},
      '/api/v1/admin/usuarios' => {
          'usuarios': [
            {
              'id': 9,
              'nome': 'Joao Profissional',
              'email': 'joao@exemplo.com',
              'perfil_tipo': 'profissional',
              'ativo': true,
            }
          ],
          'total': 1,
          'page': 1,
          'pageSize': 20,
          'totalPages': 1,
          'hasMore': false,
        },
      '/api/v1/admin/denuncias' => {
          'denuncias': [
            {
              'id': 30,
              'motivo': 'cobranca_indevida',
              'status': 'aberta',
              'denunciante_nome': 'Ana Cliente',
              'servico_solicitado_id': 44,
            }
          ],
        },
      _ => <String, dynamic>{},
    };
    return ResponseBody.fromString(
      jsonEncode(body),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  testWidgets('admin visualiza fila de denuncias e filtro de status',
      (tester) async {
    final dio = Dio(BaseOptions(baseUrl: 'https://api.example.test'))
      ..httpClientAdapter = _AdapterAdminDenuncias();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiServiceProvider.overrideWithValue(ApiService(dio))],
        child: const MaterialApp(
          home: Scaffold(body: AdminDashboardScreen()),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.text('Usuarios (1)'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Usuarios (1)'), findsOneWidget);
    expect(find.text('Joao Profissional'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Denuncias e disputas'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Denuncias e disputas'), findsOneWidget);
    expect(find.textContaining('Denuncia #30'), findsOneWidget);
    expect(find.text('Filtrar por status'), findsOneWidget);
  });
}
