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

/// Serviço centralizado de API REST — mapeia regras de negócio aos endpoints do backend.
class ApiService {
  ApiService(this._dio);

  final Dio _dio;

  // ─── Auth ───────────────────────────────────────────────────────────────

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

  // ─── Prestadores ────────────────────────────────────────────────────────

  Future<List<PrestadorModel>> listarPrestadoresPorGps({
    required double lat,
    required double lng,
  }) async {
    final response = await _dio.get(
      ApiConfig.prestadores,
      queryParameters: {
        'lat': lat,
        'lng': lng,
      },
    );
    return (response.data as List<dynamic>)
        .map((e) => PrestadorModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

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

  // ─── Chamados / Solicitações ────────────────────────────────────────────

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

  Future<List<ChamadoModel>> listarChamadosPrestador() async {
    final response = await _dio.get(ApiConfig.chamadosMeus);
    return (response.data as List<dynamic>)
        .map((e) => ChamadoModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<ChamadoModel>> listarChamadosCliente() async {
    final response = await _dio.get(ApiConfig.chamadosCliente);
    return (response.data as List<dynamic>)
        .map((e) => ChamadoModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

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

  // ─── Avaliações ─────────────────────────────────────────────────────────

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

  Future<AvaliacoesResumoModel> listarAvaliacoesProfissional(int id) async {
    final response = await _dio.get(ApiConfig.avaliacoesProfissional(id));
    return AvaliacoesResumoModel.fromJson(response.data as Map<String, dynamic>);
  }

  // ─── Health ─────────────────────────────────────────────────────────────

  Future<bool> checkHealth() async {
    try {
      await _dio.get(ApiConfig.status);
      return true;
    } catch (_) {
      return false;
    }
  }

  static Object unwrap(Object error) => DioClient.unwrapError(error);
}
