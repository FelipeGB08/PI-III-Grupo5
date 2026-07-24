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
    double? atendimentoLatitude,
    double? atendimentoLongitude,
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
      atendimentoLatitude: atendimentoLatitude,
      atendimentoLongitude: atendimentoLongitude,
      fotoUrl: fotoUrl,
    );
  }

  @override
  Future<PaginaChamados> listarMeusChamados({
    bool isPrestador = false,
    int page = 1,
    int pageSize = 20,
  }) {
    if (isPrestador) {
      return _api.listarChamadosPrestador(page: page, pageSize: pageSize);
    }

    return _api.listarChamadosCliente(page: page, pageSize: pageSize);
  }

  @override
  Future<Chamado> buscarPorId(int chamadoId) {
    return _api.buscarChamado(chamadoId);
  }

  @override
  Future<Chamado> atualizarStatus({
    required int chamadoId,
    required ChamadoStatus status,
  }) {
    return _api.atualizarStatusChamado(
      chamadoId: chamadoId,
      status: status,
    );
  }

  @override
  Future<Chamado> confirmarConclusao({required int chamadoId}) {
    return _api.confirmarConclusao(chamadoId: chamadoId);
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

  @override
  Future<Chamado> proporValor({
    required int chamadoId,
    required double preco,
    String? motivo,
  }) {
    return _api.proporValorChamado(
      chamadoId: chamadoId,
      preco: preco,
      motivo: motivo,
    );
  }

  @override
  Future<Chamado> aceitarPropostaValor({required int chamadoId}) {
    return _api.aceitarPropostaValor(chamadoId: chamadoId);
  }

  @override
  Future<Chamado> recusarPropostaValor({required int chamadoId}) {
    return _api.recusarPropostaValor(chamadoId: chamadoId);
  }
}
