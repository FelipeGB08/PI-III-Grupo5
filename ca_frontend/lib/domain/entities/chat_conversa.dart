import 'chamado.dart';

class ChatConversa {
  const ChatConversa({
    required this.servicoId,
    required this.status,
    required this.outroUsuarioId,
    required this.outroUsuarioNome,
    required this.outroUsuarioTipo,
    this.outroUsuarioFotoUrl,
    this.servicoNome,
    this.descricao,
    this.preco,
    this.agendadoPara,
    this.enderecoAtendimento,
    this.ultimaMensagem,
    this.ultimaMensagemEm,
    this.naoLidas = 0,
  });

  final int servicoId;
  final ChamadoStatus status;
  final int outroUsuarioId;
  final String outroUsuarioNome;
  final String outroUsuarioTipo;
  final String? outroUsuarioFotoUrl;
  final String? servicoNome;
  final String? descricao;
  final double? preco;
  final DateTime? agendadoPara;
  final String? enderecoAtendimento;
  final String? ultimaMensagem;
  final DateTime? ultimaMensagemEm;
  final int naoLidas;
}
