class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.servicoId,
    required this.remetenteId,
    required this.mensagem,
    required this.criadoEm,
    this.remetenteNome,
    this.lidaEm,
  });

  final int id;
  final int servicoId;
  final int remetenteId;
  final String? remetenteNome;
  final String mensagem;
  final DateTime criadoEm;
  final DateTime? lidaEm;

  ChatMessage copyWith({DateTime? lidaEm}) {
    return ChatMessage(
      id: id,
      servicoId: servicoId,
      remetenteId: remetenteId,
      mensagem: mensagem,
      criadoEm: criadoEm,
      remetenteNome: remetenteNome,
      lidaEm: lidaEm ?? this.lidaEm,
    );
  }
}
