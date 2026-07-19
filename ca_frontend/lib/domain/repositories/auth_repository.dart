import '../entities/user.dart';

class AuthResult {
  const AuthResult({
    required this.token,
    required this.user,
    this.refreshToken,
  });

  final String token;
  final User user;
  final String? refreshToken;
}

class RegisterParams {
  const RegisterParams({
    required this.nome,
    required this.email,
    required this.senha,
    required this.tipo,
    required this.cidadeAmauc,
    this.enderecoPrincipal,
    this.latitude,
    this.longitude,
    this.bio,
    this.telefoneComercial,
    this.cidades = const [],
    this.categorias = const [],
  });

  final String nome;
  final String email;
  final String senha;
  final UserTipo tipo;
  final String cidadeAmauc;
  final String? enderecoPrincipal;
  final double? latitude;
  final double? longitude;
  final String? bio;
  final String? telefoneComercial;
  final List<String> cidades;
  final List<String> categorias;
}

abstract class AuthRepository {
  Future<AuthResult> login({required String email, required String senha});
  Future<AuthResult> socialLogin({
    required String provider,
    required String token,
    required String cidadeAmauc,
  });
  Future<AuthResult> refreshSession();
  Future<AuthResult> register(RegisterParams params);
  Future<String?> requestMagicLink({required String email});
  Future<AuthResult> verifyMagicLink({required String token});
  Future<String?> requestPasswordReset({required String email});
  Future<void> confirmPasswordReset({
    required String token,
    required String senha,
  });
  Future<void> logout();
  Future<String?> getToken();
  Future<User?> getCurrentUser();
  Future<void> saveSession(AuthResult result);
  Future<User> refreshProfile();
  Future<User> updateProfile({
    String? nome,
    String? telefone,
    String? enderecoPrincipal,
    double? latitude,
    double? longitude,
    String? fotoUrl,
  });
  Future<String> uploadAvatar(String filePath);
  Future<String> uploadAvatarBytes({
    required List<int> bytes,
    required String filename,
  });
  Future<void> persistUser(User user);
}
