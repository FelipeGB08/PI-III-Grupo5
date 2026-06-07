import '../../domain/entities/user.dart';

class UserModel extends User {
  const UserModel({
    required super.id,
    required super.nome,
    required super.email,
    required super.tipo,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: _parseInt(json['id']),
      nome: json['nome']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      tipo: UserTipoX.fromApi(json['tipo_usuario']?.toString() ?? 'cidadao'),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'nome': nome,
        'email': email,
        'tipo_usuario': tipo.apiValue,
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
