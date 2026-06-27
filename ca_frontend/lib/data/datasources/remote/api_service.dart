import 'package:dio/dio.dart';

import '../../../core/config/api_config.dart';
import '../../../core/network/dio_client.dart';
import '../../../domain/entities/agenda_config.dart';
import '../../../domain/entities/chamado.dart';
import '../../../domain/repositories/auth_repository.dart';
import '../../models/avaliacao_model.dart';
import '../../models/chamado_model.dart';
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

  Future<Map<String, dynamic>> register(RegisterParams params) async {
    final response = await _dio.post(
      ApiConfig.authRegister,
      data: {
        'nome': params.nome,
        'email': params.email,
        'senha': params.senha,
        'telefone': params.telefoneComercial ?? '',
        'cidade_amauc': params.cidadeAmauc,
        'perfil_tipo': params.tipo.name,
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
  }) async {
    await _dio.post(
      ApiConfig.perfil,
      data: {
        'biografia': bio,
        'bio': bio,
        'anos_experiencia': 0,
        'categoria': categoria,
        'cidade_amauc': cidade,
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
  }) async {
    final data = {
      'biografia': biografia,
      'anos_experiencia': anosExperiencia,
      'curriculo_texto': curriculoTexto ?? '',
      'portfolio_url': portfolioUrl ?? '',
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
    String? fotoUrl,
  }) async {
    final response = await _dio.patch(
      ApiConfig.usuariosMe,
      data: {
        if (nome != null) 'nome': nome,
        if (telefone != null) 'telefone': telefone,
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
    final formData = FormData.fromMap({
      'foto': await MultipartFile.fromFile(
        filePath,
        filename: filePath.split(RegExp(r'[/\\]')).last,
      ),
    });
    final response = await _dio.post(ApiConfig.upload, data: formData);
    final data = response.data as Map<String, dynamic>;
    return data['foto_url']?.toString() ?? '';
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
  }) async {
    final response = await _dio.get(
      ApiConfig.prestadores,
      queryParameters: {'lat': lat, 'lng': lng},
    );
    return (response.data as List<dynamic>)
        .map((e) => PrestadorModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Busca prestadores por filtros de cidade ou categoria.
  Future<List<PrestadorModel>> buscarPrestadores({
    String? cidade,
    String? categoria,
  }) async {
    final response = await _dio.get(
      ApiConfig.prestadores,
      queryParameters: {
        if (cidade != null) 'cidade': cidade,
        if (categoria != null) 'categoria': categoria,
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
      ),
    );
    final data = response.data as Map<String, dynamic>;
    return ChamadoModel.fromJson(
      (data['solicitacao'] as Map<String, dynamic>?) ?? data,
    );
  }

  /// Lista chamados do Prestador. Opcionalmente filtra por status (pendente, aceito, etc).
  Future<List<ChamadoModel>> listarChamadosPrestador({String? status}) async {
    final response = await _dio.get(
      ApiConfig.chamadosMeus,
      queryParameters: {
        if (status != null) 'status': status,
      },
    );
    return (response.data as List<dynamic>)
        .map((e) => ChamadoModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Lista chamados do Cliente. Opcionalmente filtra por status.
  Future<List<ChamadoModel>> listarChamadosCliente({String? status}) async {
    final response = await _dio.get(
      ApiConfig.chamadosCliente,
      queryParameters: {
        if (status != null) 'status': status,
      },
    );
    return (response.data as List<dynamic>)
        .map((e) => ChamadoModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Atualiza o status de um chamado. Pode incluir preço opcional.
  Future<ChamadoModel> atualizarStatusChamado({
    required int chamadoId,
    required ChamadoStatus status,
    double? preco,
  }) async {
    final response = await _dio.patch(
      ApiConfig.chamadoStatus(chamadoId),
      data: ChamadoModel(
        id: chamadoId,
        descricao: '',
        status: status,
        profissionalId: 0,
      ).toStatusJson(status, preco: preco),
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
        if (motivo != null && motivo.trim().isNotEmpty)
          'motivo': motivo.trim(),
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
        if (motivo != null && motivo.trim().isNotEmpty)
          'motivo': motivo.trim(),
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
  Future<AvaliacoesResumoModel> listarAvaliacoesProfissional(int id) async {
    final response = await _dio.get(ApiConfig.avaliacoesProfissional(id));
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
  static Object unwrap(Object error) => DioClient.unwrapError(error);
}
