import 'package:dio/dio.dart';

import '../../core/config/amauc_constants.dart';
import '../../domain/entities/prestador.dart';
import '../../domain/repositories/prestador_repository.dart';
import '../datasources/remote/api_service.dart';

class PrestadorRepositoryImpl implements PrestadorRepository {
  PrestadorRepositoryImpl(this._api);

  final ApiService _api;

  @override
  Future<List<Prestador>> listar({
    String? cidade,
    String? categoria,
    double? lat,
    double? lng,
  }) async {
    final categoriaFiltro =
        AmaucConstants.categoriaNomePorId(categoria) ?? categoria;

    return _api.buscarPrestadores(
      cidade: cidade,
      categoria: categoriaFiltro,
    );
  }

  @override
  Future<Prestador?> buscarPorId(int id) async {
    try {
      return await _api.buscarPrestadorPorId(id);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      rethrow;
    }
  }
}
