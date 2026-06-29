import 'chamado.dart';

class FinanceiroResumo {
  const FinanceiroResumo({
    required this.totalOrcamentos,
    required this.pendentes,
    required this.emAberto,
    required this.concluidos,
    required this.recusados,
    required this.cancelados,
    required this.totalConcluido,
    required this.totalEmAberto,
    required this.totalCancelado,
    required this.totalRecusado,
    required this.volumeTotal,
    required this.labelTotalConcluido,
    required this.labelTotalEmAberto,
  });

  final int totalOrcamentos;
  final int pendentes;
  final int emAberto;
  final int concluidos;
  final int recusados;
  final int cancelados;
  final double totalConcluido;
  final double totalEmAberto;
  final double totalCancelado;
  final double totalRecusado;
  final double volumeTotal;
  final String labelTotalConcluido;
  final String labelTotalEmAberto;
}

class FinanceiroItem {
  const FinanceiroItem({
    required this.id,
    required this.status,
    required this.contraparteNome,
    this.servicoNome,
    this.descricao,
    this.preco,
    this.agendadoPara,
    this.criadoEm,
    this.enderecoAtendimento,
    this.politicaCancelamento,
    this.reembolsoStatus,
  });

  final int id;
  final ChamadoStatus status;
  final String contraparteNome;
  final String? servicoNome;
  final String? descricao;
  final double? preco;
  final DateTime? agendadoPara;
  final DateTime? criadoEm;
  final String? enderecoAtendimento;
  final String? politicaCancelamento;
  final String? reembolsoStatus;
}

class FinanceiroData {
  const FinanceiroData({
    required this.perfil,
    required this.resumo,
    required this.itens,
  });

  final String perfil;
  final FinanceiroResumo resumo;
  final List<FinanceiroItem> itens;

  bool get isPrestador => perfil == 'prestador';
}
