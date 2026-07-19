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
    String? fotoUrl,
  });

  Future<List<Chamado>> listarMeusChamados({bool isPrestador = false});

  Future<Chamado> buscarPorId(int chamadoId);

  Future<Chamado> atualizarStatus({
    required int chamadoId,
    required ChamadoStatus status,
  });

  Future<Chamado> uploadFotosConclusao({
    required int chamadoId,
    required List<String> filePaths,
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

  Future<Chamado> aceitarRemarcacao({required int chamadoId});

  Future<Chamado> recusarRemarcacao({required int chamadoId});

  Future<Chamado> proporValor({
    required int chamadoId,
    required double preco,
    String? motivo,
  });

  Future<Chamado> aceitarPropostaValor({required int chamadoId});

  Future<Chamado> recusarPropostaValor({required int chamadoId});
}
