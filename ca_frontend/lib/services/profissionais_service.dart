import 'package:dio/dio.dart';

import '../core/config/amauc_constants.dart';
import '../core/config/api_config.dart';
import '../core/network/dio_client.dart';
import '../data/models/prestador_model.dart';

/// Serviço HTTP de busca de profissionais com filtros por cidade e categoria.
class ProfissionaisService {
  ProfissionaisService(this._dio);

  final Dio _dio;

  Future<List<PrestadorModel>> listar({
    String? cidade,
    String? categoria,
  }) async {
    try {
      final categoriaFiltro =
          AmaucConstants.categoriaNomePorId(categoria) ?? categoria;

      final response = await _dio.get(
        ApiConfig.prestadores,
        queryParameters: {
          if (cidade != null && cidade.isNotEmpty) 'cidade': cidade,
          if (categoriaFiltro != null && categoriaFiltro.isNotEmpty)
            'categoria': categoriaFiltro,
        },
      );

      return (response.data as List<dynamic>)
          .map((e) => PrestadorModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw DioClient.unwrapError(e);
    }
  }

  Future<PrestadorModel> buscarPorId(int id) async {
    try {
      final response = await _dio.get('${ApiConfig.prestadores}/$id');
      return PrestadorModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw DioClient.unwrapError(e);
    }
  }
}
