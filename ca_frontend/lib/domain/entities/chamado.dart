enum ChamadoStatus {
  pendente,
  emAndamento,
  concluido,
  recusado,
}

extension ChamadoStatusX on ChamadoStatus {
  String get apiValue => switch (this) {
        ChamadoStatus.pendente => 'pendente',
        ChamadoStatus.emAndamento => 'em_andamento',
        ChamadoStatus.concluido => 'concluido',
        ChamadoStatus.recusado => 'recusado',
      };

  static ChamadoStatus fromApi(String? value) {
    switch (value?.toLowerCase()) {
      case 'em_andamento':
      case 'em andamento':
        return ChamadoStatus.emAndamento;
      case 'concluido':
      case 'concluído':
        return ChamadoStatus.concluido;
      case 'recusado':
        return ChamadoStatus.recusado;
      default:
        return ChamadoStatus.pendente;
    }
  }

  String get label => switch (this) {
        ChamadoStatus.pendente => 'Pendente',
        ChamadoStatus.emAndamento => 'Em Progresso',
        ChamadoStatus.concluido => 'Concluído',
        ChamadoStatus.recusado => 'Recusado',
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
    );
  }
}
