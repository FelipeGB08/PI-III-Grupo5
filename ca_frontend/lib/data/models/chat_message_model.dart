import '../../domain/entities/chat_message.dart';

class ChatMessageModel extends ChatMessage {
  const ChatMessageModel({
    required super.id,
    required super.servicoId,
    required super.remetenteId,
    required super.mensagem,
    required super.criadoEm,
    super.remetenteNome,
    super.lidaEm,
  });

  factory ChatMessageModel.fromJson(Map<String, dynamic> json) {
    return ChatMessageModel(
      id: _parseInt(json['id']),
      servicoId: _parseInt(json['servico_id']),
      remetenteId: _parseInt(json['remetente_id']),
      remetenteNome: json['remetente_nome']?.toString(),
      mensagem: json['mensagem']?.toString() ?? '',
      criadoEm: DateTime.tryParse(json['criado_em']?.toString() ?? '') ??
          DateTime.now(),
      lidaEm: DateTime.tryParse(json['lida_em']?.toString() ?? ''),
    );
  }

  static int _parseInt(dynamic value) {
    if (value is int) return value;
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }
}
