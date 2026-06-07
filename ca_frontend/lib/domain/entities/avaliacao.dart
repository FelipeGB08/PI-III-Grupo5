class Avaliacao {
  const Avaliacao({
    required this.id,
    required this.nota,
    this.comentario,
    this.cidadaoNome,
    this.dataCriacao,
  });

  final int id;
  final int nota;
  final String? comentario;
  final String? cidadaoNome;
  final String? dataCriacao;
}

class AvaliacoesResumo {
  const AvaliacoesResumo({
    required this.media,
    required this.avaliacoes,
  });

  final double media;
  final List<Avaliacao> avaliacoes;
}
