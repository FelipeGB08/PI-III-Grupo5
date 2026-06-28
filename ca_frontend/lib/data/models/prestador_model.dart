import '../../domain/entities/prestador.dart';

class PrestadorModel extends Prestador {
  const PrestadorModel({
    required super.id,
    required super.nome,
    required super.cidade,
    super.bio,
    super.categoria,
    super.categorias,
    super.mediaAvaliacao,
    super.totalServicos,
    super.disponivel,
    super.verificado,
    super.fotoUrl,
    super.portfolioUrls,
    super.certificacoes,
    super.avaliacoesPositivas,
    super.distanciaKm,
    super.latitude,
    super.longitude,
    super.telefone,
    super.anosExperiencia,
    super.curriculoTexto,
    super.portfolioUrl,
    super.atendeRural,
    super.atendeEmergencia,
    super.possuiVeiculo,
    super.cidadesAtendidas,
    super.taxaDeslocamento,
  });

  factory PrestadorModel.fromJson(Map<String, dynamic> json) {
    final categoriasLista = _parseCategorias(json, null);
    final categoria = json['categoria']?.toString() ??
        (categoriasLista.isNotEmpty ? categoriasLista.first : null);
    return PrestadorModel(
      id: _parseInt(json['id'] ?? json['usuario_id']),
      nome: json['nome']?.toString() ?? 'Profissional',
      cidade:
          json['cidade_amauc']?.toString() ?? json['cidade']?.toString() ?? '',
      bio: json['bio']?.toString() ?? json['biografia']?.toString(),
      categoria: categoria,
      categorias: _parseCategorias(json, categoria),
      mediaAvaliacao: _parseDouble(json['media_avaliacao'] ?? json['media']),
      totalServicos: _parseInt(json['total_servicos'] ?? json['servicos']),
      disponivel: json['disponivel'] != false,
      verificado: json['verificado'] == true || json['verificado'] == 'true',
      fotoUrl: json['foto_url']?.toString(),
      portfolioUrls: _parseStringList(
        json['portfolio_fotos'] ?? json['portfolio'],
      ),
      certificacoes: _parseStringList(json['certificacoes']),
      avaliacoesPositivas: _parseInt(json['avaliacoes_positivas']),
      distanciaKm: _parseDoubleNullable(json['distancia_km']),
      latitude: _parseDoubleNullable(json['latitude'] ?? json['lat']),
      longitude: _parseDoubleNullable(json['longitude'] ?? json['lng']),
      telefone: json['telefone']?.toString() ??
          json['telefone_comercial']?.toString(),
      anosExperiencia: _parseIntNullable(json['anos_experiencia']),
      curriculoTexto: json['curriculo_texto']?.toString(),
      portfolioUrl: json['portfolio_url']?.toString(),
      atendeRural: _parseBool(json['atende_rural']),
      atendeEmergencia: _parseBool(json['atende_emergencia']),
      possuiVeiculo: _parseBool(json['possui_veiculo']),
      cidadesAtendidas: _parseStringList(json['cidades_atendidas']),
      taxaDeslocamento: _parseDoubleNullable(json['taxa_deslocamento']),
    );
  }

  static int _parseInt(dynamic v) =>
      v is int ? v : int.tryParse(v?.toString() ?? '') ?? 0;

  static int? _parseIntNullable(dynamic v) => v == null ? null : _parseInt(v);

  static double _parseDouble(dynamic v) =>
      v is num ? v.toDouble() : double.tryParse(v?.toString() ?? '') ?? 0;

  static double? _parseDoubleNullable(dynamic v) =>
      v == null ? null : _parseDouble(v);

  static bool _parseBool(dynamic v) =>
      v == true || v?.toString().toLowerCase() == 'true';

  static List<String> _parseCategorias(
    Map<String, dynamic> json,
    String? categoria,
  ) {
    final raw = json['categorias'];
    if (raw is List) {
      return raw.map((e) => e.toString()).toList();
    }
    if (categoria != null) return [categoria];
    return const [];
  }

  static List<String> _parseStringList(dynamic v) {
    if (v is List) return v.map((e) => e.toString()).toList();
    return const [];
  }
}
