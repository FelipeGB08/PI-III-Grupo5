class Notificacao {
  const Notificacao({
    required this.id,
    required this.tipo,
    required this.titulo,
    required this.corpo,
    required this.payload,
    required this.status,
    required this.criadoEm,
    this.enviadaEm,
    this.lidaEm,
  });

  final int id;
  final String tipo;
  final String titulo;
  final String corpo;
  final Map<String, dynamic> payload;
  final String status;
  final DateTime criadoEm;
  final DateTime? enviadaEm;
  final DateTime? lidaEm;

  bool get lida => lidaEm != null;
}
