import '../../domain/entities/user.dart';

class UserModel extends User {
  const UserModel({
    required super.id,
    required super.nome,
    required super.email,
    required super.tipo,
    super.telefone,
    super.cidadeAmauc,
    super.fotoUrl,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: _parseInt(json['id']),
      nome: json['nome']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      tipo: UserTipoX.fromApi(
        json['perfil_tipo']?.toString() ??
            json['tipo_usuario']?.toString() ??
            'cidadao',
      ),
      telefone: json['telefone']?.toString(),
      cidadeAmauc: json['cidade_amauc']?.toString(),
      fotoUrl: json['foto_url']?.toString(),
    );
  }

  factory UserModel.fromUser(User user) {
    return UserModel(
      id: user.id,
      nome: user.nome,
      email: user.email,
      tipo: user.tipo,
      telefone: user.telefone,
      cidadeAmauc: user.cidadeAmauc,
      fotoUrl: user.fotoUrl,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'nome': nome,
        'email': email,
        'perfil_tipo': tipo.apiValue,
        'tipo_usuario': tipo.apiValue,
        if (telefone != null) 'telefone': telefone,
        if (cidadeAmauc != null) 'cidade_amauc': cidadeAmauc,
        if (fotoUrl != null) 'foto_url': fotoUrl,
      };

  static int _parseInt(dynamic value) {
    if (value is int) return value;
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }
}

class AuthResponseModel {
  const AuthResponseModel({required this.token, required this.user});

  final String token;
  final UserModel user;

  factory AuthResponseModel.fromJson(Map<String, dynamic> json) {
    return AuthResponseModel(
      token: json['token']?.toString() ?? '',
      user: UserModel.fromJson(
        (json['usuario'] as Map<String, dynamic>?) ?? {},
      ),
    );
  }
}
