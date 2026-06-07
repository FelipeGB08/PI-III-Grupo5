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
    final categoriaFiltro = AmaucConstants.categoriaNomePorId(categoria) ?? categoria;

    if (cidade != null) {
      final porCidade = await _api.buscarPrestadores(
        cidade: cidade,
        categoria: categoriaFiltro,
      );
      if (porCidade.isNotEmpty) return porCidade;
    }

    return _api.listarPrestadoresPorGps(
      lat: lat ?? AmaucConstants.defaultLat,
      lng: lng ?? AmaucConstants.defaultLng,
    );
  }

  @override
  Future<Prestador?> buscarPorId(int id) async {
    final todos = await listar(cidade: AmaucConstants.cidades.first);
    for (final p in todos) {
      if (p.id == id) return p;
    }
    final gps = await listar();
    return gps.cast<Prestador?>().firstWhere(
          (p) => p?.id == id,
          orElse: () => null,
        );
  }
}
