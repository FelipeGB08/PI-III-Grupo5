import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:http_parser/http_parser.dart';

import '../../../core/config/amauc_constants.dart';
import '../../../core/config/api_config.dart';
import '../../../core/network/dio_client.dart';
import '../../../domain/entities/agenda_config.dart';
import '../../../domain/entities/chamado.dart';
import '../../../domain/entities/user.dart';
import '../../../domain/repositories/auth_repository.dart';
import '../../models/avaliacao_model.dart';
import '../../models/chat_conversa_model.dart';
import '../../models/chat_message_model.dart';
import '../../models/chamado_model.dart';
import '../../models/financeiro_model.dart';
import '../../models/notificacao_model.dart';
import '../../models/prestador_model.dart';
import '../../models/user_model.dart';

/// [ApiService]
/// Responsável pela comunicação direta com o backend.
/// Todas as requisições utilizam o cliente Dio configurado.
///
/// Padrão: Métodos assíncronos que retornam o objeto de modelo (Model)
/// ou lançam uma exceção tratada pelo [DioClient].
class ApiService {
  ApiService(this._dio);

  final Dio _dio;

  // ─── AUTH ───────────────────────────────────────────────────────────────

  /// Autentica o usuário no sistema.
  Future<AuthResponseModel> login({
    required String email,
    required String senha,
  }) async {
    final response = await _dio.post(
      ApiConfig.authLogin,
      data: {'email': email, 'senha': senha},
    );
    return AuthResponseModel.fromJson(response.data as Map<String, dynamic>);
  }

  /// Realiza o registro de um novo usuário.
  Future<AuthResponseModel> socialLogin({
    required String provider,
    required String token,
    required String cidadeAmauc,
  }) async {
    final response = await _dio.post(
      ApiConfig.authSocialLogin,
      data: {
        'provider': provider,
        'token': token,
        'cidade_amauc': cidadeAmauc,
      },
    );
    return AuthResponseModel.fromJson(response.data as Map<String, dynamic>);
  }

  Future<AuthResponseModel> refreshSession({
    required String refreshToken,
  }) async {
    final response = await _dio.post(
      ApiConfig.authRefresh,
      data: {'refresh_token': refreshToken},
    );
    return AuthResponseModel.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> logout({required String refreshToken}) async {
    await _dio.post(
      ApiConfig.authLogout,
      data: {'refresh_token': refreshToken},
    );
  }

  Future<void> excluirConta({required String confirmacao}) async {
    await _dio.delete(
      ApiConfig.perfilConta,
      data: {'confirmacao': confirmacao},
    );
  }

  Future<Map<String, dynamic>> register(RegisterParams params) async {
    final categoriaPrincipal = params.categorias.isNotEmpty
        ? AmaucConstants.categoriaNomePorId(params.categorias.first)
        : null;

    final response = await _dio.post(
      ApiConfig.authRegister,
      data: {
        'nome': params.nome,
        'email': params.email,
        'senha': params.senha,
        'telefone': params.telefoneComercial ?? '',
        'cidade_amauc': params.cidadeAmauc,
        'endereco_principal': params.enderecoPrincipal ?? '',
        if (params.latitude != null) 'latitude': params.latitude,
        if (params.longitude != null) 'longitude': params.longitude,
        'perfil_tipo': params.tipo.name,
        if (params.tipo.isPrestador) ...{
          'biografia': params.bio ?? '',
          'bio': params.bio ?? '',
          'categoria': categoriaPrincipal,
          'categorias': params.categorias
              .map((id) => AmaucConstants.categoriaNomePorId(id) ?? id)
              .toList(),
          'cidades_atendidas':
              params.cidades.isNotEmpty ? params.cidades : [params.cidadeAmauc],
        },
      },
    );
    return response.data as Map<String, dynamic>;
  }

  /// Solicita envio de magic link (login sem senha) por e-mail.
  Future<String?> requestMagicLink({required String email}) async {
    final response = await _dio.post(
      ApiConfig.authMagicLink,
      data: {'email': email.trim()},
    );
    final data = response.data as Map<String, dynamic>?;
    return data?['dev_token']?.toString();
  }

  Future<AuthResponseModel> verifyMagicLink({required String token}) async {
    final response = await _dio.post(
      ApiConfig.authMagicLinkVerify,
      data: {'token': token.trim()},
    );
    return AuthResponseModel.fromJson(response.data as Map<String, dynamic>);
  }

  Future<String?> requestPasswordReset({required String email}) async {
    final response = await _dio.post(
      ApiConfig.authPasswordResetRequest,
      data: {'email': email.trim()},
    );
    final data = response.data as Map<String, dynamic>?;
    return data?['dev_token']?.toString();
  }

  Future<void> confirmPasswordReset({
    required String token,
    required String senha,
  }) async {
    await _dio.post(
      ApiConfig.authPasswordResetConfirm,
      data: {
        'token': token.trim(),
        'senha': senha,
      },
    );
  }

  /// Cria o perfil de prestador/profissional do usuário.
  Future<void> criarPerfilProfissional({
    required String bio,
    required String telefoneComercial,
    required String cidade,
    required String categoria,
    List<String> cidadesAtendidas = const [],
    bool atendeRural = false,
    bool atendeEmergencia = false,
    bool possuiVeiculo = false,
    double? taxaDeslocamento,
  }) async {
    await _dio.post(
      ApiConfig.perfil,
      data: {
        'biografia': bio,
        'bio': bio,
        'anos_experiencia': 0,
        'categoria': categoria,
        'cidade_amauc': cidade,
        'cidades_atendidas':
            cidadesAtendidas.isEmpty ? [cidade] : cidadesAtendidas,
        'atende_rural': atendeRural,
        'atende_emergencia': atendeEmergencia,
        'possui_veiculo': possuiVeiculo,
        if (taxaDeslocamento != null) 'taxa_deslocamento': taxaDeslocamento,
      },
    );
  }

  /// Busca os dados completos do usuário logado.
  Future<Map<String, dynamic>> buscarMeuPerfilProfissional() async {
    final response = await _dio.get(ApiConfig.perfilMeu);
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> salvarCurriculoProfissional({
    required String biografia,
    required int anosExperiencia,
    String? curriculoTexto,
    String? portfolioUrl,
    List<String> portfolioFotos = const [],
    List<String> certificacoes = const [],
    List<String> cidadesAtendidas = const [],
    bool? atendeRural,
    bool? atendeEmergencia,
    bool? possuiVeiculo,
    double? taxaDeslocamento,
  }) async {
    final data = {
      'biografia': biografia,
      'anos_experiencia': anosExperiencia,
      'curriculo_texto': curriculoTexto ?? '',
      'portfolio_url': portfolioUrl ?? '',
      'portfolio_fotos': portfolioFotos,
      'certificacoes': certificacoes,
      'cidades_atendidas': cidadesAtendidas,
      if (atendeRural != null) 'atende_rural': atendeRural,
      if (atendeEmergencia != null) 'atende_emergencia': atendeEmergencia,
      if (possuiVeiculo != null) 'possui_veiculo': possuiVeiculo,
      if (taxaDeslocamento != null) 'taxa_deslocamento': taxaDeslocamento,
    };

    try {
      final response = await _dio.patch(ApiConfig.perfil, data: data);
      final payload = response.data as Map<String, dynamic>;
      return (payload['perfil'] as Map<String, dynamic>?) ?? payload;
    } on DioException catch (e) {
      if (e.response?.statusCode != 404) rethrow;
      final response = await _dio.post(ApiConfig.perfil, data: data);
      final payload = response.data as Map<String, dynamic>;
      return (payload['perfil'] as Map<String, dynamic>?) ?? payload;
    }
  }

  Future<UserModel> buscarMeuPerfil() async {
    final response = await _dio.get(ApiConfig.usuariosMe);
    final data = response.data as Map<String, dynamic>;
    return UserModel.fromJson(
      (data['usuario'] as Map<String, dynamic>?) ?? data,
    );
  }

  /// Atualiza nome, telefone e foto do usuário logado.
  Future<UserModel> atualizarMeuPerfil({
    String? nome,
    String? telefone,
    String? enderecoPrincipal,
    double? latitude,
    double? longitude,
    String? fotoUrl,
  }) async {
    final response = await _dio.patch(
      ApiConfig.usuariosMe,
      data: {
        if (nome != null) 'nome': nome,
        if (telefone != null) 'telefone': telefone,
        if (enderecoPrincipal != null) 'endereco_principal': enderecoPrincipal,
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
        if (fotoUrl != null) 'foto_url': fotoUrl,
      },
    );
    final data = response.data as Map<String, dynamic>;
    return UserModel.fromJson(
      (data['usuario'] as Map<String, dynamic>?) ?? data,
    );
  }

  /// Envia foto de perfil para o servidor.
  Future<String> uploadFotoPerfil(String filePath) async {
    final filename = filePath.split(RegExp(r'[/\\]')).last;
    final formData = FormData.fromMap({
      'foto': await MultipartFile.fromFile(
        filePath,
        filename: filename,
        contentType: _mediaTypeFor(filename),
      ),
    });
    final response = await _dio.post(ApiConfig.upload, data: formData);
    final data = response.data as Map<String, dynamic>;
    return data['foto_url']?.toString() ?? '';
  }

  Future<String> uploadFotoPerfilBytes({
    required Uint8List bytes,
    required String filename,
  }) async {
    final formData = FormData.fromMap({
      'foto': MultipartFile.fromBytes(
        bytes,
        filename: filename,
        contentType: _mediaTypeFor(filename),
      ),
    });
    final response = await _dio.post(ApiConfig.upload, data: formData);
    final data = response.data as Map<String, dynamic>;
    return data['foto_url']?.toString() ?? '';
  }

  Future<String> uploadImagemServico(String filePath) {
    return uploadFotoPerfil(filePath);
  }

  Future<String> uploadImagemServicoBytes({
    required Uint8List bytes,
    required String filename,
  }) {
    return uploadFotoPerfilBytes(bytes: bytes, filename: filename);
  }

  Future<void> registrarDeviceToken({
    required String token,
    required String plataforma,
  }) async {
    await _dio.post(
      ApiConfig.dispositivoToken,
      data: {
        'token': token,
        'plataforma': plataforma,
      },
    );
  }

  Future<NotificacoesResponse> listarNotificacoes({
    int page = 1,
    int limit = 20,
    bool somenteNaoLidas = false,
  }) async {
    final response = await _dio.get(
      ApiConfig.notificacoes,
      queryParameters: {
        'page': page,
        'limit': limit,
        if (somenteNaoLidas) 'nao_lidas': true,
      },
    );
    return NotificacoesResponse.fromJson(
      response.data as Map<String, dynamic>,
    );
  }

  Future<void> marcarNotificacaoLida(int id) async {
    await _dio.patch(ApiConfig.notificacaoLida(id));
  }

  Future<void> marcarTodasNotificacoesLidas() async {
    await _dio.patch(ApiConfig.notificacoesLidas());
  }

  Future<FinanceiroDataModel> buscarFinanceiro({String? status}) async {
    final response = await _dio.get(
      ApiConfig.financeiro,
      queryParameters: {
        if (status != null && status.isNotEmpty) 'status': status,
      },
    );
    return FinanceiroDataModel.fromJson(response.data as Map<String, dynamic>);
  }

  Future<AgendaConfig> buscarAgendaProfissional(int profissionalId) async {
    final response =
        await _dio.get(ApiConfig.agendaProfissional(profissionalId));
    return AgendaConfig.fromJson(response.data as Map<String, dynamic>);
  }

  Future<AgendaConfig> buscarMinhaAgenda() async {
    final response = await _dio.get(ApiConfig.agendaMe);
    return AgendaConfig.fromJson(response.data as Map<String, dynamic>);
  }

  Future<AgendaConfig> salvarMinhaAgenda(AgendaConfig config) async {
    final response = await _dio.put(ApiConfig.agendaMe, data: config.toJson());
    final data = response.data as Map<String, dynamic>;
    return AgendaConfig.fromJson(
      (data['agenda'] as Map<String, dynamic>?) ?? data,
    );
  }

  // ─── PRESTADORES ────────────────────────────────────────────────────────

  /// Lista prestadores baseando-se na geolocalização.
  Future<List<PrestadorModel>> listarPrestadoresPorGps({
    required double lat,
    required double lng,
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _dio.get(
      ApiConfig.prestadores,
      queryParameters: {
        'lat': lat,
        'lng': lng,
        'page': page,
        'limit': limit,
      },
    );
    return (response.data as List<dynamic>)
        .map((e) => PrestadorModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  List<dynamic> _asListResponse(dynamic data, List<String> keys) {
    if (data is List<dynamic>) return data;
    if (data is Map<String, dynamic>) {
      for (final key in keys) {
        final value = data[key];
        if (value is List<dynamic>) return value;
      }
    }
    return const [];
  }

  /// Busca prestadores por filtros de cidade ou categoria.
  Future<List<PrestadorModel>> buscarPrestadores({
    String? cidade,
    String? categoria,
    double? lat,
    double? lng,
    double? raioKm,
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _dio.get(
      ApiConfig.prestadores,
      queryParameters: {
        if (cidade != null) 'cidade': cidade,
        if (categoria != null) 'categoria': categoria,
        if (lat != null) 'lat': lat,
        if (lng != null) 'lng': lng,
        if (raioKm != null) 'raio_km': raioKm,
        'page': page,
        'limit': limit,
      },
    );
    return (response.data as List<dynamic>)
        .map((e) => PrestadorModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Busca um prestador único pelo ID.
  Future<PrestadorModel> buscarPrestadorPorId(int id) async {
    final response = await _dio.get('${ApiConfig.prestadores}/$id');
    return PrestadorModel.fromJson(response.data as Map<String, dynamic>);
  }

  // ─── CHAMADOS / SOLICITAÇÕES ────────────────────────────────────────────

  /// Cria um novo chamado (solicitação de serviço).
  Future<ChamadoModel> criarChamado({
    required int profissionalId,
    required String descricao,
    int? agendaServicoId,
    String? servicoNome,
    double? preco,
    DateTime? agendadoPara,
    String? enderecoAtendimento,
    String? fotoUrl,
  }) async {
    final response = await _dio.post(
      ApiConfig.chamados,
      data: ChamadoModel(
        id: 0,
        descricao: descricao,
        status: ChamadoStatus.pendente,
        profissionalId: profissionalId,
      ).toCreateJson(
        profissionalId: profissionalId,
        descricao: descricao,
        agendaServicoId: agendaServicoId,
        servicoNome: servicoNome,
        preco: preco,
        agendadoPara: agendadoPara,
        enderecoAtendimento: enderecoAtendimento,
        fotoUrl: fotoUrl,
      ),
    );
    final data = response.data as Map<String, dynamic>;
    return ChamadoModel.fromJson(
      (data['solicitacao'] as Map<String, dynamic>?) ?? data,
    );
  }

  Future<List<ChatMessageModel>> listarMensagensChat(int chamadoId) async {
    final response =
        await _dio.get('${ApiConfig.chamados}/$chamadoId/mensagens');
    final data = response.data as Map<String, dynamic>;
    final mensagens = (data['mensagens'] as List<dynamic>?) ?? const [];
    return mensagens
        .map((item) => ChatMessageModel.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<ChatConversaModel>> listarConversasChat() async {
    final response = await _dio.get(ApiConfig.conversas);
    final data = response.data as Map<String, dynamic>;
    final conversas = (data['conversas'] as List<dynamic>?) ?? const [];
    return conversas
        .map((item) => ChatConversaModel.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<ChatMessageModel> enviarMensagemChat({
    required int chamadoId,
    required String mensagem,
  }) async {
    final response = await _dio.post(
      '${ApiConfig.chamados}/$chamadoId/mensagens',
      data: {'mensagem': mensagem},
    );
    final data = response.data as Map<String, dynamic>;
    return ChatMessageModel.fromJson(data['mensagem'] as Map<String, dynamic>);
  }

  /// Lista chamados do Prestador. Opcionalmente filtra por status (pendente, aceito, etc).
  Future<PaginaChamados> listarChamadosPrestador({
    String? status,
    int page = 1,
    int pageSize = 20,
  }) async {
    final response = await _dio.get(
      ApiConfig.chamadosPrestador,
      queryParameters: {
        if (status != null) 'status': status,
        'page': page,
        'pageSize': pageSize,
      },
    );
    return _paginaChamados(
      response.data,
      const ['solicitacoes', 'pedidos'],
      page,
      pageSize,
    );
  }

  PaginaChamados _paginaChamados(
    dynamic responseData,
    List<String> keys,
    int fallbackPage,
    int fallbackPageSize,
  ) {
    final items = _asListResponse(responseData, keys)
        .map((e) => ChamadoModel.fromJson(e as Map<String, dynamic>))
        .toList();
    final data = responseData is Map<String, dynamic>
        ? responseData
        : const <String, dynamic>{};
    final total = int.tryParse('${data['total']}') ?? items.length;
    final currentPage = int.tryParse('${data['page']}') ?? fallbackPage;
    final currentPageSize =
        int.tryParse('${data['pageSize']}') ?? fallbackPageSize;
    final totalPages = int.tryParse('${data['totalPages']}') ??
        (total == 0 ? 0 : (total / currentPageSize).ceil());
    final hasMore = data['hasMore'] is bool
        ? data['hasMore'] as bool
        : currentPage < totalPages;

    return PaginaChamados(
      items: items,
      total: total,
      page: currentPage,
      pageSize: currentPageSize,
      totalPages: totalPages,
      hasMore: hasMore,
    );
  }

  /// Lista chamados do Cliente. Opcionalmente filtra por status.
  Future<PaginaChamados> listarChamadosCliente({
    String? status,
    int page = 1,
    int pageSize = 20,
  }) async {
    final response = await _dio.get(
      ApiConfig.chamadosCliente,
      queryParameters: {
        if (status != null) 'status': status,
        'page': page,
        'pageSize': pageSize,
      },
    );
    return _paginaChamados(
      response.data,
      const ['pedidos', 'solicitacoes'],
      page,
      pageSize,
    );
  }

  /// Busca um chamado acessível pelo usuário autenticado.
  Future<ChamadoModel> buscarChamado(int chamadoId) async {
    final response = await _dio.get(ApiConfig.chamadoDetalhe(chamadoId));
    final data = response.data as Map<String, dynamic>;
    return ChamadoModel.fromJson(
      (data['solicitacao'] as Map<String, dynamic>?) ?? data,
    );
  }

  Future<ChamadoModel> atualizarStatusChamado({
    required int chamadoId,
    required ChamadoStatus status,
  }) async {
    final response = await _dio.patch(
      ApiConfig.chamadoStatus(chamadoId),
      data: ChamadoModel(
        id: chamadoId,
        descricao: '',
        status: status,
        profissionalId: 0,
      ).toStatusJson(status),
    );
    final data = response.data as Map<String, dynamic>;
    return ChamadoModel.fromJson(
      (data['solicitacao'] as Map<String, dynamic>?) ?? data,
    );
  }

  Future<ChamadoModel> proporValorChamado({
    required int chamadoId,
    required double preco,
    String? motivo,
  }) async {
    final response = await _dio.patch(
      ApiConfig.propostaValor(chamadoId),
      data: {
        'preco': preco,
        if (motivo != null && motivo.isNotEmpty) 'motivo': motivo,
      },
    );
    final data = response.data as Map<String, dynamic>;
    return ChamadoModel.fromJson(
      (data['solicitacao'] as Map<String, dynamic>?) ?? data,
    );
  }

  Future<ChamadoModel> aceitarPropostaValor({required int chamadoId}) async {
    final response =
        await _dio.patch(ApiConfig.aceitarPropostaValor(chamadoId));
    final data = response.data as Map<String, dynamic>;
    return ChamadoModel.fromJson(
      (data['solicitacao'] as Map<String, dynamic>?) ?? data,
    );
  }

  Future<ChamadoModel> recusarPropostaValor({required int chamadoId}) async {
    final response =
        await _dio.patch(ApiConfig.recusarPropostaValor(chamadoId));
    final data = response.data as Map<String, dynamic>;
    return ChamadoModel.fromJson(
      (data['solicitacao'] as Map<String, dynamic>?) ?? data,
    );
  }

  Future<ChamadoModel> uploadFotosConclusao({
    required int chamadoId,
    required List<String> filePaths,
  }) async {
    final arquivos = <MultipartFile>[];

    for (final path in filePaths) {
      final filename = path.split(RegExp(r'[/\\]')).last;
      arquivos.add(
        await MultipartFile.fromFile(
          path,
          filename: filename,
          contentType: _mediaTypeFor(filename),
        ),
      );
    }

    final response = await _dio.post(
      ApiConfig.fotosConclusaoSolicitacao(chamadoId),
      data: FormData.fromMap({'fotos': arquivos}),
    );
    final data = response.data as Map<String, dynamic>;
    return ChamadoModel.fromJson(
      (data['solicitacao'] as Map<String, dynamic>?) ?? data,
    );
  }

  Future<ChamadoModel> uploadFotosConclusaoBytes({
    required int chamadoId,
    required List<Uint8List> bytesList,
    required List<String> filenames,
  }) async {
    final arquivos = <MultipartFile>[];

    for (var i = 0; i < bytesList.length; i++) {
      arquivos.add(
        MultipartFile.fromBytes(
          bytesList[i],
          filename: i < filenames.length ? filenames[i] : 'evidencia-$i.jpg',
          contentType: _mediaTypeFor(
            i < filenames.length ? filenames[i] : 'evidencia-$i.jpg',
          ),
        ),
      );
    }

    final response = await _dio.post(
      ApiConfig.fotosConclusaoSolicitacao(chamadoId),
      data: FormData.fromMap({'fotos': arquivos}),
    );
    final data = response.data as Map<String, dynamic>;
    return ChamadoModel.fromJson(
      (data['solicitacao'] as Map<String, dynamic>?) ?? data,
    );
  }

  Future<ChamadoModel> cancelarSolicitacao({
    required int chamadoId,
    String? motivo,
  }) async {
    final response = await _dio.patch(
      ApiConfig.cancelarSolicitacao(chamadoId),
      data: {
        if (motivo != null && motivo.trim().isNotEmpty) 'motivo': motivo.trim(),
      },
    );

    final data = response.data as Map<String, dynamic>;
    return ChamadoModel.fromJson(
      (data['solicitacao'] as Map<String, dynamic>?) ?? data,
    );
  }

  Future<ChamadoModel> solicitarRemarcacao({
    required int chamadoId,
    required DateTime novaDataHora,
    String? motivo,
  }) async {
    final response = await _dio.patch(
      ApiConfig.remarcarSolicitacao(chamadoId),
      data: {
        'nova_data_hora': novaDataHora.toIso8601String(),
        if (motivo != null && motivo.trim().isNotEmpty) 'motivo': motivo.trim(),
      },
    );

    final data = response.data as Map<String, dynamic>;
    return ChamadoModel.fromJson(
      (data['solicitacao'] as Map<String, dynamic>?) ?? data,
    );
  }

  Future<ChamadoModel> aceitarRemarcacao({
    required int chamadoId,
  }) async {
    final response = await _dio.patch(
      ApiConfig.aceitarRemarcacao(chamadoId),
    );

    final data = response.data as Map<String, dynamic>;
    return ChamadoModel.fromJson(
      (data['solicitacao'] as Map<String, dynamic>?) ?? data,
    );
  }

  Future<ChamadoModel> recusarRemarcacao({
    required int chamadoId,
  }) async {
    final response = await _dio.patch(
      ApiConfig.recusarRemarcacao(chamadoId),
    );

    final data = response.data as Map<String, dynamic>;
    return ChamadoModel.fromJson(
      (data['solicitacao'] as Map<String, dynamic>?) ?? data,
    );
  }

  // ─── AVALIAÇÕES ─────────────────────────────────────────────────────────

  /// Envia uma nova avaliação para um serviço concluído.
  Future<void> criarAvaliacao({
    required int solicitacaoId,
    required int profissionalId,
    required int nota,
    String? comentario,
  }) async {
    await _dio.post(
      ApiConfig.avaliacoes,
      data: AvaliacaoModel(
        id: 0,
        nota: nota,
        comentario: comentario,
      ).toJson(
        solicitacaoId: solicitacaoId,
        profissionalId: profissionalId,
        nota: nota,
        comentario: comentario,
      ),
    );
  }

  /// Busca resumo das avaliações de um prestador.
  Future<AvaliacoesResumoModel> listarAvaliacoesProfissional(
    int id, {
    int page = 1,
    int pageSize = 20,
  }) async {
    final response = await _dio.get(
      ApiConfig.avaliacoesProfissional(id),
      queryParameters: {'page': page, 'pageSize': pageSize},
    );
    return AvaliacoesResumoModel.fromJson(
        response.data as Map<String, dynamic>);
  }

  // ─── UTILS & HEALTH ─────────────────────────────────────────────────────

  /// Verifica se a API está online.
  Future<List<Map<String, dynamic>>> listarCategorias() async {
    final response = await _dio.get(ApiConfig.categorias);
    return (response.data as List<dynamic>)
        .map((e) => e as Map<String, dynamic>)
        .toList();
  }

  Future<Map<String, dynamic>> criarCategoria(String nome) async {
    final response = await _dio.post(
      ApiConfig.adminCategorias,
      data: {'nome_servico': nome},
    );
    final data = response.data as Map<String, dynamic>;
    return (data['categoria'] as Map<String, dynamic>?) ?? data;
  }

  Future<Map<String, dynamic>> atualizarCategoria(int id, String nome) async {
    final response = await _dio.put(
      '${ApiConfig.adminCategorias}/$id',
      data: {'nome_servico': nome},
    );
    final data = response.data as Map<String, dynamic>;
    return (data['categoria'] as Map<String, dynamic>?) ?? data;
  }

  Future<void> deletarCategoria(int id) async {
    await _dio.delete('${ApiConfig.adminCategorias}/$id');
  }

  Future<Map<String, dynamic>> buscarRelatorioAdmin() async {
    final response = await _dio.get(ApiConfig.adminRelatorios);
    return response.data as Map<String, dynamic>;
  }

  Future<bool> checkHealth() async {
    try {
      await _dio.get(ApiConfig.status);
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Desembrulha erros do Dio para facilitar a leitura no nível da UI.
  MediaType _mediaTypeFor(String filename) {
    final lower = filename.toLowerCase();
    if (lower.endsWith('.png')) return MediaType('image', 'png');
    if (lower.endsWith('.webp')) return MediaType('image', 'webp');
    if (lower.endsWith('.heic')) return MediaType('image', 'heic');
    if (lower.endsWith('.heif')) return MediaType('image', 'heif');
    return MediaType('image', 'jpeg');
  }

  static Object unwrap(Object error) => DioClient.unwrapError(error);
}
