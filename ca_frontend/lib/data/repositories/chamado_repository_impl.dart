import '../../domain/entities/chamado.dart';
import '../../domain/repositories/chamado_repository.dart';
import '../datasources/remote/api_service.dart';

class ChamadoRepositoryImpl implements ChamadoRepository {
  ChamadoRepositoryImpl(this._api);

  final ApiService _api;

  @override
  Future<Chamado> criar({
    required int profissionalId,
    required String descricao,
  }) =>
      _api.criarChamado(
        profissionalId: profissionalId,
        descricao: descricao,
      );

  @override
  Future<List<Chamado>> listarMeusChamados({bool isPrestador = false}) {
    if (isPrestador) {
      return _api.listarChamadosPrestador();
    }
    return _api.listarChamadosCliente();
  }

  @override
  Future<Chamado> atualizarStatus({
    required int chamadoId,
    required ChamadoStatus status,
    double? preco,
  }) =>
      _api.atualizarStatusChamado(
        chamadoId: chamadoId,
        status: status,
        preco: preco,
      );
}
