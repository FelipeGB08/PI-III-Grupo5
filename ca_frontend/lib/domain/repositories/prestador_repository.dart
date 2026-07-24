import '../entities/prestador.dart';

abstract class PrestadorRepository {
  Future<List<Prestador>> listar({
    String? cidade,
    String? categoria,
    double? lat,
    double? lng,
    double? raioKm,
    double? precoMinimo,
    double? precoMaximo,
    double? notaMinima,
    DateTime? disponivelEm,
  });

  Future<Prestador?> buscarPorId(int id);
}
