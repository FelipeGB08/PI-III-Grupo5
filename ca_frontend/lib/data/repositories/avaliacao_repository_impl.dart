import '../../domain/entities/avaliacao.dart';
import '../../domain/repositories/avaliacao_repository.dart';
import '../datasources/remote/api_service.dart';

class AvaliacaoRepositoryImpl implements AvaliacaoRepository {
  AvaliacaoRepositoryImpl(this._api);

  final ApiService _api;

  @override
  Future<void> criar({
    required int solicitacaoId,
    required int profissionalId,
    required int nota,
    String? comentario,
  }) =>
      _api.criarAvaliacao(
        solicitacaoId: solicitacaoId,
        profissionalId: profissionalId,
        nota: nota,
        comentario: comentario,
      );

  @override
  Future<AvaliacoesResumo> listarDoProfissional(int profissionalId) =>
      _api.listarAvaliacoesProfissional(profissionalId);
}
