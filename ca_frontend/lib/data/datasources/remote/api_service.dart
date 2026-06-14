import 'package:dio/dio.dart';

import '../../../core/config/api_config.dart';
import '../../../core/network/dio_client.dart';
import '../../../domain/entities/chamado.dart';
import '../../../domain/entities/user.dart';
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
  Future<Map<String, dynamic>> register(RegisterParams params) async {
    final response = await _dio.post(
      ApiConfig.authRegister,
      data: {
        'nome': params.nome,
        'email': params.email,
        'senha': params.senha,
        'tipo_usuario': params.tipo.apiValue,
      },
    );
    return response.data as Map<String, dynamic>;
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
        'bio': bio,
        'telefone_comercial': telefoneComercial,
        'cidade': cidade,
        'categoria': categoria,
      },
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
      ApiConfig.prestadoresBusca,
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
  }) async {
    final response = await _dio.post(
      ApiConfig.chamados,
      data: ChamadoModel(
        id: 0,
        descricao: descricao,
        status: ChamadoStatus.pendente,
        profissionalId: profissionalId,
      ).toCreateJson(profissionalId: profissionalId, descricao: descricao),
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