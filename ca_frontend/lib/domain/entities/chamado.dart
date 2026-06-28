enum ChamadoStatus {
  pendente,
  emAndamento,
  remarcacaoSolicitada,
  concluido,
  recusado,
  cancelado,
}

extension ChamadoStatusX on ChamadoStatus {
  String get apiValue => switch (this) {
        ChamadoStatus.pendente => 'pendente',
        ChamadoStatus.emAndamento => 'aceito',
        ChamadoStatus.remarcacaoSolicitada => 'remarcacao_solicitada',
        ChamadoStatus.concluido => 'concluido',
        ChamadoStatus.recusado => 'recusado',
        ChamadoStatus.cancelado => 'cancelado_cliente',
      };

  static ChamadoStatus fromApi(String? value) {
    switch (value?.toLowerCase()) {
      case 'em_andamento':
      case 'em andamento':
      case 'aceito':
        return ChamadoStatus.emAndamento;
      case 'remarcacao_solicitada':
        return ChamadoStatus.remarcacaoSolicitada;
      case 'concluido':
      case 'concluído':
        return ChamadoStatus.concluido;
      case 'recusado':
        return ChamadoStatus.recusado;
      case 'cancelado_cliente':
      case 'cancelado':
        return ChamadoStatus.cancelado;
      default:
        return ChamadoStatus.pendente;
    }
  }

  String get label => switch (this) {
        ChamadoStatus.pendente => 'Pendente',
        ChamadoStatus.emAndamento => 'Confirmado',
        ChamadoStatus.remarcacaoSolicitada => 'Remarcacao',
        ChamadoStatus.concluido => 'Concluido',
        ChamadoStatus.recusado => 'Recusado',
        ChamadoStatus.cancelado => 'Cancelado',
      };
}

class Chamado {
  const Chamado({
    required this.id,
    required this.descricao,
    required this.status,
    required this.profissionalId,
    this.profissionalNome,
    this.cidadaoId,
    this.cidadaoNome,
    this.preco,
    this.dataSolicitacao,
    this.servicoNome,
    this.enderecoAtendimento,
    this.agendadoPara,
    this.fotoUrl,
    this.duracaoMinutos,
    this.remarcacaoSolicitadaPara,
    this.motivoRemarcacao,
    this.motivoCancelamento,
  });

  final int id;
  final String descricao;
  final ChamadoStatus status;
  final int profissionalId;
  final String? profissionalNome;
  final int? cidadaoId;
  final String? cidadaoNome;
  final double? preco;
  final String? dataSolicitacao;
  final String? servicoNome;
  final String? enderecoAtendimento;
  final String? agendadoPara;
  final String? fotoUrl;
  final int? duracaoMinutos;
  final String? remarcacaoSolicitadaPara;
  final String? motivoRemarcacao;
  final String? motivoCancelamento;

  Chamado copyWith({ChamadoStatus? status, double? preco}) {
    return Chamado(
      id: id,
      descricao: descricao,
      status: status ?? this.status,
      profissionalId: profissionalId,
      profissionalNome: profissionalNome,
      cidadaoId: cidadaoId,
      cidadaoNome: cidadaoNome,
      preco: preco ?? this.preco,
      dataSolicitacao: dataSolicitacao,
      servicoNome: servicoNome,
      enderecoAtendimento: enderecoAtendimento,
      agendadoPara: agendadoPara,
      fotoUrl: fotoUrl,
      duracaoMinutos: duracaoMinutos,
      remarcacaoSolicitadaPara: remarcacaoSolicitadaPara,
      motivoRemarcacao: motivoRemarcacao,
      motivoCancelamento: motivoCancelamento,
    );
  }
}
