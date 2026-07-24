enum ChamadoStatus {
  pendente,
  propostaValor,
  emAndamento,
  remarcacaoSolicitada,
  aguardandoConfirmacaoCliente,
  concluido,
  recusado,
  cancelado,
}

extension ChamadoStatusX on ChamadoStatus {
  String get apiValue => switch (this) {
        ChamadoStatus.pendente => 'pendente',
        ChamadoStatus.propostaValor => 'proposta_valor',
        ChamadoStatus.emAndamento => 'aceito',
        ChamadoStatus.remarcacaoSolicitada => 'remarcacao_solicitada',
        ChamadoStatus.aguardandoConfirmacaoCliente =>
          'aguardando_confirmacao_cliente',
        ChamadoStatus.concluido => 'concluido',
        ChamadoStatus.recusado => 'recusado',
        ChamadoStatus.cancelado => 'cancelado_cliente',
      };

  static ChamadoStatus fromApi(String? value) {
    switch (value?.toLowerCase()) {
      case 'proposta_valor':
        return ChamadoStatus.propostaValor;
      case 'em_andamento':
      case 'em andamento':
      case 'aceito':
        return ChamadoStatus.emAndamento;
      case 'remarcacao_solicitada':
        return ChamadoStatus.remarcacaoSolicitada;
      case 'aguardando_confirmacao_cliente':
        return ChamadoStatus.aguardandoConfirmacaoCliente;
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
        ChamadoStatus.propostaValor => 'Proposta',
        ChamadoStatus.emAndamento => 'Confirmado',
        ChamadoStatus.remarcacaoSolicitada => 'Remarcacao',
        ChamadoStatus.aguardandoConfirmacaoCliente => 'Aguardando cliente',
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
    this.precoProposto,
    this.dataSolicitacao,
    this.servicoNome,
    this.enderecoAtendimento,
    this.atendimentoLatitude,
    this.atendimentoLongitude,
    this.agendadoPara,
    this.fotoUrl,
    this.fotosConclusao = const [],
    this.duracaoMinutos,
    this.remarcacaoSolicitadaPara,
    this.motivoRemarcacao,
    this.motivoCancelamento,
    this.politicaCancelamento,
    this.reembolsoStatus,
    this.canceladoEm,
    this.conclusaoSolicitadaEm,
    this.conclusaoConfirmadaEm,
    this.conclusaoConfirmadaAutomaticamente = false,
  });

  final int id;
  final String descricao;
  final ChamadoStatus status;
  final int profissionalId;
  final String? profissionalNome;
  final int? cidadaoId;
  final String? cidadaoNome;
  final double? preco;
  final double? precoProposto;
  final String? dataSolicitacao;
  final String? servicoNome;
  final String? enderecoAtendimento;
  final double? atendimentoLatitude;
  final double? atendimentoLongitude;
  final String? agendadoPara;
  final String? fotoUrl;
  final List<String> fotosConclusao;
  final int? duracaoMinutos;
  final String? remarcacaoSolicitadaPara;
  final String? motivoRemarcacao;
  final String? motivoCancelamento;
  final String? politicaCancelamento;
  final String? reembolsoStatus;
  final String? canceladoEm;
  final String? conclusaoSolicitadaEm;
  final String? conclusaoConfirmadaEm;
  final bool conclusaoConfirmadaAutomaticamente;

  DateTime? get confirmacaoAutomaticaEm {
    final solicitadaEm = DateTime.tryParse(conclusaoSolicitadaEm ?? '');
    return solicitadaEm?.add(const Duration(hours: 72));
  }

  Chamado copyWith({
    ChamadoStatus? status,
    double? preco,
    double? precoProposto,
    List<String>? fotosConclusao,
    String? conclusaoSolicitadaEm,
    String? conclusaoConfirmadaEm,
    bool? conclusaoConfirmadaAutomaticamente,
  }) {
    return Chamado(
      id: id,
      descricao: descricao,
      status: status ?? this.status,
      profissionalId: profissionalId,
      profissionalNome: profissionalNome,
      cidadaoId: cidadaoId,
      cidadaoNome: cidadaoNome,
      preco: preco ?? this.preco,
      precoProposto: precoProposto ?? this.precoProposto,
      dataSolicitacao: dataSolicitacao,
      servicoNome: servicoNome,
      enderecoAtendimento: enderecoAtendimento,
      atendimentoLatitude: atendimentoLatitude,
      atendimentoLongitude: atendimentoLongitude,
      agendadoPara: agendadoPara,
      fotoUrl: fotoUrl,
      fotosConclusao: fotosConclusao ?? this.fotosConclusao,
      duracaoMinutos: duracaoMinutos,
      remarcacaoSolicitadaPara: remarcacaoSolicitadaPara,
      motivoRemarcacao: motivoRemarcacao,
      motivoCancelamento: motivoCancelamento,
      politicaCancelamento: politicaCancelamento,
      reembolsoStatus: reembolsoStatus,
      canceladoEm: canceladoEm,
      conclusaoSolicitadaEm:
          conclusaoSolicitadaEm ?? this.conclusaoSolicitadaEm,
      conclusaoConfirmadaEm:
          conclusaoConfirmadaEm ?? this.conclusaoConfirmadaEm,
      conclusaoConfirmadaAutomaticamente: conclusaoConfirmadaAutomaticamente ??
          this.conclusaoConfirmadaAutomaticamente,
    );
  }
}

class PaginaChamados {
  const PaginaChamados({
    required this.items,
    required this.total,
    required this.page,
    required this.pageSize,
    required this.totalPages,
    required this.hasMore,
  });

  final List<Chamado> items;
  final int total;
  final int page;
  final int pageSize;
  final int totalPages;
  final bool hasMore;
}
