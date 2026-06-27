import '../entities/chamado.dart';

abstract class ChamadoRepository {
  Future<Chamado> criar({
    required int profissionalId,
    required String descricao,
    int? agendaServicoId,
    String? servicoNome,
    double? preco,
    DateTime? agendadoPara,
    String? enderecoAtendimento,
  });

  Future<List<Chamado>> listarMeusChamados({bool isPrestador = false});

  Future<Chamado> atualizarStatus({
    required int chamadoId,
    required ChamadoStatus status,
    double? preco,
  });

    Future<Chamado> cancelarSolicitacao({
    required int chamadoId,
    String? motivo,
  });

  Future<Chamado> solicitarRemarcacao({
    required int chamadoId,
    required DateTime novaDataHora,
    String? motivo,
  });
}
