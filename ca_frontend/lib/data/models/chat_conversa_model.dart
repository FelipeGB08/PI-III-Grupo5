import '../../domain/entities/chamado.dart';
import '../../domain/entities/chat_conversa.dart';

class ChatConversaModel extends ChatConversa {
  const ChatConversaModel({
    required super.servicoId,
    required super.status,
    required super.outroUsuarioId,
    required super.outroUsuarioNome,
    required super.outroUsuarioTipo,
    super.outroUsuarioFotoUrl,
    super.servicoNome,
    super.descricao,
    super.preco,
    super.agendadoPara,
    super.enderecoAtendimento,
    super.ultimaMensagem,
    super.ultimaMensagemEm,
    super.naoLidas,
  });

  factory ChatConversaModel.fromJson(Map<String, dynamic> json) {
    return ChatConversaModel(
      servicoId: _asInt(json['servico_id']),
      status: ChamadoStatusX.fromApi(json['status']?.toString()),
      outroUsuarioId: _asInt(json['outro_usuario_id']),
      outroUsuarioNome: json['outro_usuario_nome']?.toString() ?? 'Contato',
      outroUsuarioTipo: json['outro_usuario_tipo']?.toString() ?? '',
      outroUsuarioFotoUrl: json['outro_usuario_foto_url']?.toString(),
      servicoNome: json['servico_nome']?.toString(),
      descricao: json['descricao']?.toString(),
      preco: _asDoubleNullable(json['preco']),
      agendadoPara: _asDate(json['agendado_para']),
      enderecoAtendimento: json['endereco_atendimento']?.toString(),
      ultimaMensagem: json['ultima_mensagem']?.toString(),
      ultimaMensagemEm: _asDate(json['ultima_mensagem_em']),
      naoLidas: _asInt(json['nao_lidas']),
    );
  }

  static int _asInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }

  static double? _asDoubleNullable(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString());
  }

  static DateTime? _asDate(dynamic value) {
    if (value == null) return null;
    return DateTime.tryParse(value.toString());
  }
}
