import 'dart:convert';
import 'dart:typed_data';

import 'package:ca_frontend/core/config/api_config.dart';
import 'package:ca_frontend/data/datasources/remote/api_service.dart';
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
  ) =>
      handler(options);

  @override
  void close({bool force = false}) {}
}

void main() {
  test('login Google envia somente token e cidade ao backend', () async {
    Map<String, dynamic>? body;
    final dio = Dio(BaseOptions(baseUrl: 'https://api.example.test'))
      ..httpClientAdapter = _StubAdapter((options) async {
        body = Map<String, dynamic>.from(options.data as Map);
        return ResponseBody.fromString(
          jsonEncode({
            'access_token': 'access',
            'refresh_token': 'refresh',
            'usuario': {
              'id': 1,
              'nome': 'Ana',
              'email': 'ana@example.test',
              'perfil_tipo': 'cidadao',
            },
          }),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

    await ApiService(dio).socialLogin(
      provider: 'google',
      token: 'google-id-token',
      cidadeAmauc: 'Concordia',
    );

    expect(body, {
      'provider': 'google',
      'token': 'google-id-token',
      'cidade_amauc': 'Concordia',
    });
  });

  test('imagem protegida usa o Dio autenticado e retorna bytes', () async {
    String? authorization;
    Uri? uri;
    final dio = Dio(BaseOptions(baseUrl: 'https://api.example.test'));
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          options.headers['Authorization'] = 'Bearer access-token';
          handler.next(options);
        },
      ),
    );
    dio.httpClientAdapter = _StubAdapter((options) async {
      authorization = options.headers['Authorization']?.toString();
      uri = options.uri;
      return ResponseBody.fromBytes(
        [1, 2, 3, 4],
        200,
        headers: {
          Headers.contentTypeHeader: ['image/jpeg'],
        },
      );
    });

    final bytes = await ApiService(dio).baixarImagemProtegida(
      '/uploads/solicitacoes/evidencia.jpg',
    );

    expect(authorization, 'Bearer access-token');
    expect(uri?.path, '/uploads/solicitacoes/evidencia.jpg');
    expect(bytes, Uint8List.fromList([1, 2, 3, 4]));
  });

  test('midia externa usa cliente separado sem bearer', () async {
    String? authorizationExterna;
    final autenticado = Dio(BaseOptions(baseUrl: 'https://api.example.test'))
      ..interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            options.headers['Authorization'] = 'Bearer privado';
            handler.next(options);
          },
        ),
      );
    final publico = Dio()
      ..httpClientAdapter = _StubAdapter((options) async {
        authorizationExterna = options.headers['Authorization']?.toString();
        return ResponseBody.fromBytes(
          [1, 2, 3],
          200,
          headers: {
            Headers.contentTypeHeader: ['image/jpeg'],
          },
        );
      });

    final bytes = await ApiService(
      autenticado,
      publicMediaDio: publico,
    ).baixarImagemProtegida('https://cdn.example.test/foto.jpg');

    expect(bytes, Uint8List.fromList([1, 2, 3]));
    expect(authorizationExterna, isNull);
  });

  test('prefixo canonico do app e api v1', () {
    expect(ApiConfig.apiPrefix, '/api/v1');
    expect(ApiConfig.authLogin, startsWith('/api/v1/'));
    expect(ApiConfig.chamados, startsWith('/api/v1/'));
  });

  test('admin usa endpoints privados para listar e aprovar verificacoes',
      () async {
    final chamadas = <String>[];
    final dio = Dio(BaseOptions(baseUrl: 'https://api.example.test'))
      ..httpClientAdapter = _StubAdapter((options) async {
        chamadas.add('${options.method} ${options.path}');
        final body = options.path.endsWith('/verificacoes')
            ? {
                'verificacoes': [
                  {'perfil_id': 8, 'nome': 'Ana Profissional'}
                ],
              }
            : {
                'verificacao': {
                  'perfil_id': 8,
                  'status_verificacao': 'aprovado'
                },
              };
        return ResponseBody.fromString(
          jsonEncode(body),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });
    final api = ApiService(dio);

    final pendentes = await api.listarVerificacoesPendentes();
    final aprovada = await api.aprovarVerificacao(8);

    expect(pendentes.single['perfil_id'], 8);
    expect(aprovada['status_verificacao'], 'aprovado');
    expect(chamadas, [
      'GET /api/v1/admin/verificacoes',
      'PATCH /api/v1/admin/verificacoes/8/aprovar',
    ]);
  });

  test('envia denuncia do chamado e administra filtro e resolucao', () async {
    final chamadas = <String>[];
    Map<String, dynamic>? corpo;
    final dio = Dio(BaseOptions(baseUrl: 'https://api.example.test'))
      ..httpClientAdapter = _StubAdapter((options) async {
        chamadas.add('${options.method} ${options.path}?${options.uri.query}');
        if (options.data is Map) {
          corpo = Map<String, dynamic>.from(options.data as Map);
        }
        final payload = options.path.endsWith('/denuncias')
            ? {
                'denuncias': [
                  {'id': 30, 'status': 'em_analise'}
                ],
              }
            : {
                'denuncia': {'id': 30, 'status': 'resolvida'},
              };
        return ResponseBody.fromString(
          jsonEncode(payload),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });
    final api = ApiService(dio);

    await api.criarDenuncia(
      chamadoId: 44,
      motivo: 'cobranca_indevida',
      descricao: 'Foi cobrado um valor diferente do combinado.',
    );
    final denuncias = await api.listarDenunciasAdmin(status: 'em_analise');
    await api.atualizarDenunciaAdmin(
      denunciaId: 30,
      status: 'resolvida',
      resolucaoAdmin: 'O caso foi analisado pela administracao.',
    );

    expect(denuncias.single['id'], 30);
    expect(corpo, {
      'status': 'resolvida',
      'resolucao_admin': 'O caso foi analisado pela administracao.',
    });
    expect(chamadas, [
      'POST /api/v1/solicitacoes/44/denuncia?',
      'GET /api/v1/admin/denuncias?status=em_analise',
      'PATCH /api/v1/admin/denuncias/30?',
    ]);
  });

  test('admin consulta usuarios, altera status e exporta CSV', () async {
    final chamadas = <String>[];
    Map<String, dynamic>? corpo;
    final dio = Dio(BaseOptions(baseUrl: 'https://api.example.test'))
      ..httpClientAdapter = _StubAdapter((options) async {
        chamadas.add('${options.method} ${options.path}?${options.uri.query}');
        if (options.data is Map) {
          corpo = Map<String, dynamic>.from(options.data as Map);
        }
        if (options.path.endsWith('/export')) {
          return ResponseBody.fromString(
            'Resumo por status',
            200,
            headers: {
              Headers.contentTypeHeader: ['text/csv; charset=utf-8'],
            },
          );
        }
        final payload = options.method == 'PATCH'
            ? {
                'usuario': {'id': 12, 'ativo': false},
              }
            : {
                'usuarios': [
                  {'id': 12, 'nome': 'Maria', 'ativo': true}
                ],
                'total': 1,
                'page': 1,
                'hasMore': false,
              };
        return ResponseBody.fromString(
          jsonEncode(payload),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });
    final api = ApiService(dio);

    final pagina = await api.listarUsuariosAdmin(
      perfilTipo: 'cidadao',
      busca: 'maria',
    );
    final usuario = await api.atualizarStatusUsuarioAdmin(12, false);
    final csv = await api.exportarRelatorioAdminCsv();

    expect(pagina['total'], 1);
    expect(usuario, {'id': 12, 'ativo': false});
    expect(corpo, {'ativo': false});
    expect(csv, 'Resumo por status');
    expect(chamadas, [
      'GET /api/v1/admin/usuarios?page=1&pageSize=20&perfil_tipo=cidadao&busca=maria',
      'PATCH /api/v1/admin/usuarios/12/status?',
      'GET /api/v1/admin/relatorios/export?formato=csv',
    ]);
  });

  test('envia filtros avancados de prestadores pela query', () async {
    Uri? uri;
    final dio = Dio(BaseOptions(baseUrl: 'https://api.example.test'))
      ..httpClientAdapter = _StubAdapter((options) async {
        uri = options.uri;
        return ResponseBody.fromString(
          '[]',
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

    await ApiService(dio).buscarPrestadores(
      precoMinimo: 80,
      precoMaximo: 250,
      notaMinima: 4.5,
      disponivelEm: DateTime(2030, 6, 10, 18),
    );

    expect(uri?.path, '/api/v1/profissionais');
    expect(uri?.queryParameters, {
      'preco_min': '80.0',
      'preco_max': '250.0',
      'nota_minima': '4.5',
      'disponivel_em': '2030-06-10',
      'page': '1',
      'limit': '20',
    });
  });

  test('consulta e atualiza preferência de avisos de horários favoritos',
      () async {
    final chamadas = <String>[];
    Map<String, dynamic>? corpo;
    final dio = Dio(BaseOptions(baseUrl: 'https://api.example.test'))
      ..httpClientAdapter = _StubAdapter((options) async {
        chamadas.add('${options.method} ${options.path}');
        if (options.data is Map) {
          corpo = Map<String, dynamic>.from(options.data as Map);
        }
        return ResponseBody.fromString(
          jsonEncode({
            'preferencias': {'novos_horarios_favoritos': true},
          }),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });
    final api = ApiService(dio);

    final ativada = await api.buscarPreferenciaNovosHorariosFavoritos();
    await api.atualizarPreferenciaNovosHorariosFavoritos(false);

    expect(ativada, isTrue);
    expect(corpo, {'novos_horarios_favoritos': false});
    expect(chamadas, [
      'GET /api/v1/notificacoes/preferencias',
      'PATCH /api/v1/notificacoes/preferencias',
    ]);
  });
}
