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
    this.verificado = false,
    this.fotoUrl,
    this.portfolioUrls = const [],
    this.distanciaKm,
    this.telefone,
    this.anosExperiencia,
    this.curriculoTexto,
    this.portfolioUrl,
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
  final bool verificado;
  final String? fotoUrl;
  final List<String> portfolioUrls;
  final double? distanciaKm;
  final String? telefone;
  final int? anosExperiencia;
  final String? curriculoTexto;
  final String? portfolioUrl;

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
      verificado: verificado,
      fotoUrl: fotoUrl,
      portfolioUrls: portfolioUrls ?? this.portfolioUrls,
      distanciaKm: distanciaKm,
      telefone: telefone,
      anosExperiencia: anosExperiencia,
      curriculoTexto: curriculoTexto,
      portfolioUrl: portfolioUrl,
    );
  }
}
