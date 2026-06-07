class Prestador {
  const Prestador({
    required this.id,
    required this.nome,
    required this.cidade,
    this.bio,
    this.categoria,
    this.categorias = const [],
    this.mediaAvaliacao = 0,
    this.totalServicos = 0,
    this.disponivel = true,
    this.fotoUrl,
    this.portfolioUrls = const [],
    this.distanciaKm,
    this.telefone,
    this.anosExperiencia,
  });

  final int id;
  final String nome;
  final String cidade;
  final String? bio;
  final String? categoria;
  final List<String> categorias;
  final double mediaAvaliacao;
  final int totalServicos;
  final bool disponivel;
  final String? fotoUrl;
  final List<String> portfolioUrls;
  final double? distanciaKm;
  final String? telefone;
  final int? anosExperiencia;

  Prestador copyWith({
    double? mediaAvaliacao,
    int? totalServicos,
    List<String>? portfolioUrls,
  }) {
    return Prestador(
      id: id,
      nome: nome,
      cidade: cidade,
      bio: bio,
      categoria: categoria,
      categorias: categorias,
      mediaAvaliacao: mediaAvaliacao ?? this.mediaAvaliacao,
      totalServicos: totalServicos ?? this.totalServicos,
      disponivel: disponivel,
      fotoUrl: fotoUrl,
      portfolioUrls: portfolioUrls ?? this.portfolioUrls,
      distanciaKm: distanciaKm,
      telefone: telefone,
      anosExperiencia: anosExperiencia,
    );
  }
}
