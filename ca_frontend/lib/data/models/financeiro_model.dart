import '../../domain/entities/chamado.dart';
import '../../domain/entities/financeiro.dart';

class FinanceiroResumoModel extends FinanceiroResumo {
  const FinanceiroResumoModel({
    required super.totalOrcamentos,
    required super.pendentes,
    required super.emAberto,
    required super.concluidos,
    required super.recusados,
    required super.cancelados,
    required super.totalConcluido,
    required super.totalEmAberto,
    required super.totalCancelado,
    required super.totalRecusado,
    required super.volumeTotal,
    required super.labelTotalConcluido,
    required super.labelTotalEmAberto,
  });

  factory FinanceiroResumoModel.fromJson(Map<String, dynamic> json) {
    return FinanceiroResumoModel(
      totalOrcamentos: _asInt(json['total_orcamentos']),
      pendentes: _asInt(json['pendentes']),
      emAberto: _asInt(json['em_aberto']),
      concluidos: _asInt(json['concluidos']),
      recusados: _asInt(json['recusados']),
      cancelados: _asInt(json['cancelados']),
      totalConcluido: _asDouble(json['total_concluido']),
      totalEmAberto: _asDouble(json['total_em_aberto']),
      totalCancelado: _asDouble(json['total_cancelado']),
      totalRecusado: _asDouble(json['total_recusado']),
      volumeTotal: _asDouble(json['volume_total']),
      labelTotalConcluido:
          json['label_total_concluido']?.toString() ?? 'Total concluído',
      labelTotalEmAberto:
          json['label_total_em_aberto']?.toString() ?? 'Em aberto',
    );
  }
}

class FinanceiroItemModel extends FinanceiroItem {
  const FinanceiroItemModel({
    required super.id,
    required super.status,
    required super.contraparteNome,
    super.servicoNome,
    super.descricao,
    super.preco,
    super.agendadoPara,
    super.criadoEm,
    super.enderecoAtendimento,
    super.politicaCancelamento,
    super.reembolsoStatus,
  });

  factory FinanceiroItemModel.fromJson(Map<String, dynamic> json) {
    return FinanceiroItemModel(
      id: _asInt(json['id']),
      status: ChamadoStatusX.fromApi(json['status']?.toString()),
      contraparteNome: json['contraparte_nome']?.toString() ?? 'Usuário',
      servicoNome: json['servico_nome']?.toString(),
      descricao: json['descricao']?.toString(),
      preco: json['preco'] == null ? null : _asDouble(json['preco']),
      agendadoPara: _asDate(json['agendado_para']),
      criadoEm: _asDate(json['criado_em']),
      enderecoAtendimento: json['endereco_atendimento']?.toString(),
      politicaCancelamento: json['politica_cancelamento']?.toString(),
      reembolsoStatus: json['reembolso_status']?.toString(),
    );
  }
}

class FinanceiroDataModel extends FinanceiroData {
  const FinanceiroDataModel({
    required super.perfil,
    required super.resumo,
    required super.itens,
  });

  factory FinanceiroDataModel.fromJson(Map<String, dynamic> json) {
    final rawItens = json['itens'];
    return FinanceiroDataModel(
      perfil: json['perfil']?.toString() ?? 'cliente',
      resumo: FinanceiroResumoModel.fromJson(
        _asMap(json['resumo']),
      ),
      itens: rawItens is List
          ? rawItens
              .whereType<Map>()
              .map((item) => FinanceiroItemModel.fromJson(
                    item.map((key, value) => MapEntry(key.toString(), value)),
                  ))
              .toList()
          : const [],
    );
  }
}

int _asInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

double _asDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? 0;
}

DateTime? _asDate(dynamic value) {
  if (value == null) return null;
  return DateTime.tryParse(value.toString());
}

Map<String, dynamic> _asMap(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) {
    return value.map((key, item) => MapEntry(key.toString(), item));
  }
  return const {};
}
