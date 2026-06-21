import '../entities/user.dart';

class AuthResult {
  const AuthResult({required this.token, required this.user});

  final String token;
  final User user;
}

class RegisterParams {
  const RegisterParams({
    required this.nome,
    required this.email,
    required this.senha,
    required this.tipo,
    this.bio,
    this.telefoneComercial,
    this.cidades = const [],
    this.categorias = const [],
  });

  final String nome;
  final String email;
  final String senha;
  final UserTipo tipo;
  final String? bio;
  final String? telefoneComercial;
  final List<String> cidades;
  final List<String> categorias;
}

abstract class AuthRepository {
  Future<AuthResult> login({required String email, required String senha});
  Future<AuthResult> register(RegisterParams params);
  Future<void> requestMagicLink({required String email});
  Future<void> logout();
  Future<String?> getToken();
  Future<User?> getCurrentUser();
  Future<void> saveSession(AuthResult result);
  Future<User> refreshProfile();
  Future<User> updateProfile({
    String? nome,
    String? telefone,
    String? fotoUrl,
  });
  Future<String> uploadAvatar(String filePath);
  Future<void> persistUser(User user);
}
