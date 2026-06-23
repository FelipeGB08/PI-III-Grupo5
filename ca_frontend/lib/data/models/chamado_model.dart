import '../../domain/entities/chamado.dart';

class ChamadoModel extends Chamado {
  const ChamadoModel({
    required super.id,
    required super.descricao,
    required super.status,
    required super.profissionalId,
    super.profissionalNome,
    super.cidadaoId,
    super.cidadaoNome,
    super.preco,
    super.dataSolicitacao,
    super.servicoNome,
    super.enderecoAtendimento,
    super.agendadoPara,
  });

  factory ChamadoModel.fromJson(Map<String, dynamic> json) {
    return ChamadoModel(
      id: _parseInt(json['id']),
      descricao: json['descricao']?.toString() ?? '',
      status: ChamadoStatusX.fromApi(json['status']?.toString()),
      profissionalId: _parseInt(json['profissional_id'] ?? json['prof_id']),
      profissionalNome: json['profissional_nome']?.toString(),
      cidadaoId: _parseIntNullable(json['cidadao_id']),
      cidadaoNome: json['cidadao_nome']?.toString(),
      preco: _parseDoubleNullable(json['preco']),
      dataSolicitacao:
          json['data_solicitacao']?.toString() ?? json['criado_em']?.toString(),
      servicoNome: json['servico_nome']?.toString(),
      enderecoAtendimento: json['endereco_atendimento']?.toString(),
      agendadoPara: json['agendado_para']?.toString(),
    );
  }

  Map<String, dynamic> toCreateJson({
    required int profissionalId,
    required String descricao,
    int? agendaServicoId,
    String? servicoNome,
    double? preco,
    DateTime? agendadoPara,
    String? enderecoAtendimento,
  }) =>
      {
        'profissional_id': profissionalId,
        'descricao': descricao,
        if (agendaServicoId != null) 'agenda_servico_id': agendaServicoId,
        if (servicoNome != null && servicoNome.isNotEmpty)
          'servico_nome': servicoNome,
        if (preco != null) 'preco': preco,
        if (agendadoPara != null)
          'agendado_para': agendadoPara.toIso8601String(),
        if (enderecoAtendimento != null && enderecoAtendimento.isNotEmpty)
          'endereco_atendimento': enderecoAtendimento,
      };

  Map<String, dynamic> toStatusJson(ChamadoStatus status, {double? preco}) => {
        'status': status.apiValue,
        if (preco != null) 'preco': preco,
      };

  static int _parseInt(dynamic v) =>
      v is int ? v : int.tryParse(v?.toString() ?? '') ?? 0;

  static int? _parseIntNullable(dynamic v) => v == null ? null : _parseInt(v);

  static double? _parseDoubleNullable(dynamic v) {
    if (v == null) return null;
    return v is num ? v.toDouble() : double.tryParse(v.toString());
  }
}
