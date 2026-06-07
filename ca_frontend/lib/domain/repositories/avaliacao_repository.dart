import '../entities/avaliacao.dart';

abstract class AvaliacaoRepository {
  Future<void> criar({
    required int solicitacaoId,
    required int profissionalId,
    required int nota,
    String? comentario,
  });

  Future<AvaliacoesResumo> listarDoProfissional(int profissionalId);
}
