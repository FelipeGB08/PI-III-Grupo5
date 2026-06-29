enum UserTipo { cidadao, profissional, admin }

extension UserTipoX on UserTipo {
  String get apiValue => switch (this) {
        UserTipo.cidadao => 'cidadao',
        UserTipo.profissional => 'profissional',
        UserTipo.admin => 'admin',
      };

  static UserTipo fromApi(String value) => switch (value.toLowerCase()) {
        'profissional' || 'prestador' => UserTipo.profissional,
        'admin' => UserTipo.admin,
        _ => UserTipo.cidadao,
      };

  bool get isCliente => this == UserTipo.cidadao;
  bool get isPrestador => this == UserTipo.profissional;
  bool get isAdmin => this == UserTipo.admin;
}

class User {
  const User({
    required this.id,
    required this.nome,
    required this.email,
    required this.tipo,
    this.telefone,
    this.cidadeAmauc,
    this.enderecoPrincipal,
    this.latitude,
    this.longitude,
    this.fotoUrl,
  });

  final int id;
  final String nome;
  final String email;
  final UserTipo tipo;
  final String? telefone;
  final String? cidadeAmauc;
  final String? enderecoPrincipal;
  final double? latitude;
  final double? longitude;
  final String? fotoUrl;

  User copyWith({
    String? nome,
    String? telefone,
    String? enderecoPrincipal,
    double? latitude,
    double? longitude,
    String? fotoUrl,
  }) {
    return User(
      id: id,
      nome: nome ?? this.nome,
      email: email,
      tipo: tipo,
      telefone: telefone ?? this.telefone,
      cidadeAmauc: cidadeAmauc,
      enderecoPrincipal: enderecoPrincipal ?? this.enderecoPrincipal,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      fotoUrl: fotoUrl ?? this.fotoUrl,
    );
  }
}
