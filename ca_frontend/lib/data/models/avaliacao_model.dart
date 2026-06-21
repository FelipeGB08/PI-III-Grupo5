import '../../domain/entities/avaliacao.dart';

class AvaliacaoModel extends Avaliacao {
  const AvaliacaoModel({
    required super.id,
    required super.nota,
    super.comentario,
    super.cidadaoNome,
    super.dataCriacao,
  });

  factory AvaliacaoModel.fromJson(Map<String, dynamic> json) {
    return AvaliacaoModel(
      id: _parseInt(json['id']),
      nota: _parseInt(json['nota_estrelas'] ?? json['nota']),
      comentario: json['comentario']?.toString(),
      cidadaoNome: json['cidadao_nome']?.toString(),
      dataCriacao: json['criado_em']?.toString() ?? json['data']?.toString(),
    );
  }

  Map<String, dynamic> toJson({
    required int solicitacaoId,
    required int profissionalId,
    required int nota,
    String? comentario,
  }) =>
      {
        'servico_id': solicitacaoId,
        'solicitacao_id': solicitacaoId,
        'nota_estrelas': nota,
        'nota': nota,
        if (comentario != null && comentario.isNotEmpty)
          'comentario': comentario,
      };

  static int _parseInt(dynamic v) =>
      v is int ? v : int.tryParse(v?.toString() ?? '') ?? 0;
}

class AvaliacoesResumoModel extends AvaliacoesResumo {
  const AvaliacoesResumoModel({
    required super.media,
    required super.avaliacoes,
  });

  factory AvaliacoesResumoModel.fromJson(Map<String, dynamic> json) {
    final list = (json['avaliacoes'] as List<dynamic>? ?? [])
        .map((e) => AvaliacaoModel.fromJson(e as Map<String, dynamic>))
        .toList();
    final media = json['media'];
    return AvaliacoesResumoModel(
      media: media is num ? media.toDouble() : double.tryParse('$media') ?? 0,
      avaliacoes: list,
    );
  }
}
