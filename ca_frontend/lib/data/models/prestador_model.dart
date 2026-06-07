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
    super.fotoUrl,
    super.portfolioUrls,
    super.distanciaKm,
    super.telefone,
    super.anosExperiencia,
  });

  factory PrestadorModel.fromJson(Map<String, dynamic> json) {
    final categoria = json['categoria']?.toString();
    return PrestadorModel(
      id: _parseInt(json['id'] ?? json['usuario_id']),
      nome: json['nome']?.toString() ?? 'Profissional',
      cidade: json['cidade']?.toString() ?? '',
      bio: json['bio']?.toString() ?? json['biografia']?.toString(),
      categoria: categoria,
      categorias: categoria != null ? [categoria] : const [],
      mediaAvaliacao: _parseDouble(json['media_avaliacao'] ?? json['media']),
      totalServicos: _parseInt(json['total_servicos'] ?? json['servicos']),
      disponivel: json['disponivel'] != false,
      fotoUrl: json['foto_url']?.toString(),
      portfolioUrls: _parseStringList(json['portfolio']),
      distanciaKm: _parseDoubleNullable(json['distancia_km']),
      telefone: json['telefone_comercial']?.toString(),
      anosExperiencia: _parseIntNullable(json['anos_experiencia']),
    );
  }

  static int _parseInt(dynamic v) =>
      v is int ? v : int.tryParse(v?.toString() ?? '') ?? 0;

  static int? _parseIntNullable(dynamic v) =>
      v == null ? null : _parseInt(v);

  static double _parseDouble(dynamic v) =>
      v is num ? v.toDouble() : double.tryParse(v?.toString() ?? '') ?? 0;

  static double? _parseDoubleNullable(dynamic v) =>
      v == null ? null : _parseDouble(v);

  static List<String> _parseStringList(dynamic v) {
    if (v is List) return v.map((e) => e.toString()).toList();
    return const [];
  }
}
