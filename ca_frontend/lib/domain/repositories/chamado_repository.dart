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
}
