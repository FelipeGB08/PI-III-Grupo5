import 'package:dio/dio.dart';

import '../core/config/api_config.dart';
import '../core/network/dio_client.dart';
import '../data/models/avaliacao_model.dart';

/// Serviço HTTP de avaliações (RF08/RF09 — apenas serviços concluídos).
class AvaliacoesService {
  AvaliacoesService(this._dio);

  final Dio _dio;

  Future<void> criar({
    required int servicoId,
    required int notaEstrelas,
    String? comentario,
  }) async {
    try {
      await _dio.post(
        ApiConfig.avaliacoes,
        data: {
          'servico_id': servicoId,
          'nota_estrelas': notaEstrelas,
          if (comentario != null && comentario.isNotEmpty)
            'comentario': comentario,
        },
      );
    } on DioException catch (e) {
      throw DioClient.unwrapError(e);
    }
  }

  Future<AvaliacoesResumoModel> listarDoProfissional(int profissionalId) async {
    try {
      final response =
          await _dio.get(ApiConfig.avaliacoesProfissional(profissionalId));
      return AvaliacoesResumoModel.fromJson(
        response.data as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      throw DioClient.unwrapError(e);
    }
  }
}
