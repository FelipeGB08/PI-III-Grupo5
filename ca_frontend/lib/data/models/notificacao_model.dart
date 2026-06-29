import '../../domain/entities/notificacao.dart';

class NotificacaoModel extends Notificacao {
  const NotificacaoModel({
    required super.id,
    required super.tipo,
    required super.titulo,
    required super.corpo,
    required super.payload,
    required super.status,
    required super.criadoEm,
    super.enviadaEm,
    super.lidaEm,
  });

  factory NotificacaoModel.fromJson(Map<String, dynamic> json) {
    return NotificacaoModel(
      id: _asInt(json['id']),
      tipo: json['tipo']?.toString() ?? '',
      titulo: json['titulo']?.toString() ?? '',
      corpo: json['corpo']?.toString() ?? '',
      payload: _asMap(json['payload']),
      status: json['status']?.toString() ?? '',
      criadoEm: _asDate(json['criado_em']) ?? DateTime.now(),
      enviadaEm: _asDate(json['enviada_em']),
      lidaEm: _asDate(json['lida_em']),
    );
  }

  static int _asInt(dynamic value) {
    if (value is int) return value;
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }

  static DateTime? _asDate(dynamic value) {
    if (value == null) return null;
    return DateTime.tryParse(value.toString());
  }

  static Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) {
      return value.map((key, item) => MapEntry(key.toString(), item));
    }
    return const {};
  }
}

class NotificacoesResponse {
  const NotificacoesResponse({
    required this.notificacoes,
    required this.total,
    required this.naoLidas,
    required this.page,
    required this.limit,
  });

  final List<NotificacaoModel> notificacoes;
  final int total;
  final int naoLidas;
  final int page;
  final int limit;

  factory NotificacoesResponse.fromJson(Map<String, dynamic> json) {
    final rawList = json['notificacoes'];
    return NotificacoesResponse(
      notificacoes: rawList is List
          ? rawList
              .whereType<Map>()
              .map((item) => NotificacaoModel.fromJson(
                    item.map((key, value) => MapEntry(key.toString(), value)),
                  ))
              .toList()
          : const [],
      total: NotificacaoModel._asInt(json['total']),
      naoLidas: NotificacaoModel._asInt(json['nao_lidas']),
      page: NotificacaoModel._asInt(json['page']),
      limit: NotificacaoModel._asInt(json['limit']),
    );
  }
}
