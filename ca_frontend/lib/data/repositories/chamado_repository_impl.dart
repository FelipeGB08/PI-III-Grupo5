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
    int? agendaServicoId,
    String? servicoNome,
    double? preco,
    DateTime? agendadoPara,
    String? enderecoAtendimento,
    String? fotoUrl,
  }) {
    return _api.criarChamado(
      profissionalId: profissionalId,
      descricao: descricao,
      agendaServicoId: agendaServicoId,
      servicoNome: servicoNome,
      preco: preco,
      agendadoPara: agendadoPara,
      enderecoAtendimento: enderecoAtendimento,
      fotoUrl: fotoUrl,
    );
  }

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
  }) {
    return _api.atualizarStatusChamado(
      chamadoId: chamadoId,
      status: status,
      preco: preco,
    );
  }

  @override
  Future<Chamado> cancelarSolicitacao({
    required int chamadoId,
    String? motivo,
  }) {
    return _api.cancelarSolicitacao(
      chamadoId: chamadoId,
      motivo: motivo,
    );
  }

  @override
  Future<Chamado> solicitarRemarcacao({
    required int chamadoId,
    required DateTime novaDataHora,
    String? motivo,
  }) {
    return _api.solicitarRemarcacao(
      chamadoId: chamadoId,
      novaDataHora: novaDataHora,
      motivo: motivo,
    );
  }

  @override
  Future<Chamado> uploadFotosConclusao({
    required int chamadoId,
    required List<String> filePaths,
  }) {
    return _api.uploadFotosConclusao(
      chamadoId: chamadoId,
      filePaths: filePaths,
    );
  }

  @override
  Future<Chamado> aceitarRemarcacao({required int chamadoId}) {
    return _api.aceitarRemarcacao(chamadoId: chamadoId);
  }

  @override
  Future<Chamado> recusarRemarcacao({required int chamadoId}) {
    return _api.recusarRemarcacao(chamadoId: chamadoId);
  }
}
