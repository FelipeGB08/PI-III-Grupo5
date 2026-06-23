class AgendaServico {
  const AgendaServico({
    required this.nome,
    required this.duracaoMinutos,
    required this.preco,
    this.id,
  });

  final int? id;
  final String nome;
  final int duracaoMinutos;
  final double preco;

  String get duracaoLabel {
    if (duracaoMinutos < 60) return 'Aprox. $duracaoMinutos min';
    final horas = duracaoMinutos ~/ 60;
    final minutos = duracaoMinutos % 60;
    if (minutos == 0) return 'Aprox. $horas ${horas == 1 ? 'hora' : 'horas'}';
    return 'Aprox. $horas h $minutos min';
  }

  factory AgendaServico.fromJson(Map<String, dynamic> json) {
    return AgendaServico(
      id: _parseIntNullable(json['id']),
      nome: json['nome']?.toString() ?? '',
      duracaoMinutos: _parseInt(
        json['duracao_minutos'] ?? json['duracaoMinutos'],
        fallback: 60,
      ),
      preco: _parseDouble(json['preco'], fallback: 0),
    );
  }

  Map<String, dynamic> toJson() => {
        if (id != null) 'id': id,
        'nome': nome,
        'duracao_minutos': duracaoMinutos,
        'preco': preco,
      };
}

class AgendaHorario {
  const AgendaHorario({required this.diaSemana, required this.horario});

  final int diaSemana;
  final String horario;

  factory AgendaHorario.fromJson(Map<String, dynamic> json) {
    final rawHorario = json['horario']?.toString() ?? '';
    return AgendaHorario(
      diaSemana: _parseInt(json['dia_semana'] ?? json['diaSemana']),
      horario: rawHorario.length >= 5 ? rawHorario.substring(0, 5) : rawHorario,
    );
  }

  Map<String, dynamic> toJson() => {
        'dia_semana': diaSemana,
        'horario': horario,
      };
}

class AgendaConfig {
  const AgendaConfig({
    required this.servicos,
    required this.horarios,
    required this.diasSemana,
    this.usandoPadrao = false,
  });

  final List<AgendaServico> servicos;
  final List<AgendaHorario> horarios;
  final List<int> diasSemana;
  final bool usandoPadrao;

  factory AgendaConfig.fromJson(Map<String, dynamic> json) {
    final horarios = (json['horarios'] as List<dynamic>? ?? const [])
        .map((e) => AgendaHorario.fromJson(e as Map<String, dynamic>))
        .where((e) => e.horario.isNotEmpty)
        .toList();

    return AgendaConfig(
      usandoPadrao: json['usando_padrao'] == true,
      servicos: (json['servicos'] as List<dynamic>? ?? const [])
          .map((e) => AgendaServico.fromJson(e as Map<String, dynamic>))
          .where((e) => e.nome.isNotEmpty && e.preco > 0)
          .toList(),
      horarios: horarios,
      diasSemana: (json['dias_semana'] as List<dynamic>? ?? const [])
          .map((e) => _parseInt(e))
          .where((e) => e >= 1 && e <= 7)
          .toSet()
          .toList()
        ..sort(),
    );
  }

  Map<String, dynamic> toJson() => {
        'servicos': servicos.map((e) => e.toJson()).toList(),
        'horarios': horarios.map((e) => e.toJson()).toList(),
        'dias_semana': diasSemana,
      };
}

int _parseInt(dynamic value, {int fallback = 0}) {
  if (value is int) return value;
  return int.tryParse(value?.toString() ?? '') ?? fallback;
}

int? _parseIntNullable(dynamic value) {
  if (value == null) return null;
  return int.tryParse(value.toString());
}

double _parseDouble(dynamic value, {double fallback = 0}) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? fallback;
}
