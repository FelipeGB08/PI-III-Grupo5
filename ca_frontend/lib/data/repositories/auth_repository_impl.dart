import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../../core/network/dio_client.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/local/token_storage.dart';
import '../datasources/remote/api_service.dart';
import '../models/user_model.dart';

class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl(this._api, this._storage);

  final ApiService _api;
  final TokenStorage _storage;

  @override
  Future<AuthResult> login({
    required String email,
    required String senha,
  }) async {
    try {
      final response = await _api.login(email: email, senha: senha);
      final result = AuthResult(
        token: response.token,
        user: response.user,
        refreshToken: response.refreshToken,
      );
      await saveSession(result);
      return result;
    } on DioException catch (e) {
      throw DioClient.unwrapError(e);
    }
  }

  @override
  Future<AuthResult> socialLogin({
    required String provider,
    required String token,
    required String cidadeAmauc,
  }) async {
    try {
      final response = await _api.socialLogin(
        provider: provider,
        token: token,
        cidadeAmauc: cidadeAmauc,
      );
      final result = AuthResult(
        token: response.token,
        user: response.user,
        refreshToken: response.refreshToken,
      );
      await saveSession(result);
      return result;
    } on DioException catch (e) {
      throw DioClient.unwrapError(e);
    }
  }

  @override
  Future<AuthResult> refreshSession() async {
    final refreshToken = _storage.getRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) {
      throw StateError('Sessao sem refresh token.');
    }

    try {
      final response = await _api.refreshSession(refreshToken: refreshToken);
      final result = AuthResult(
        token: response.token,
        user: response.user,
        refreshToken: refreshToken,
      );
      await saveSession(result);
      return result;
    } on DioException catch (e) {
      throw DioClient.unwrapError(e);
    }
  }

  @override
  Future<AuthResult> register(RegisterParams params) async {
    try {
      await _api.register(params);
    } on DioException catch (e) {
      throw DioClient.unwrapError(e);
    }

    return login(email: params.email, senha: params.senha);
  }

  @override
  Future<String?> requestMagicLink({required String email}) async {
    try {
      return await _api.requestMagicLink(email: email);
    } on DioException catch (e) {
      throw DioClient.unwrapError(e);
    }
  }

  @override
  Future<AuthResult> verifyMagicLink({required String token}) async {
    try {
      final response = await _api.verifyMagicLink(token: token);
      final result = AuthResult(
        token: response.token,
        user: response.user,
        refreshToken: response.refreshToken,
      );
      await saveSession(result);
      return result;
    } on DioException catch (e) {
      throw DioClient.unwrapError(e);
    }
  }

  @override
  Future<String?> requestPasswordReset({required String email}) async {
    try {
      return await _api.requestPasswordReset(email: email);
    } on DioException catch (e) {
      throw DioClient.unwrapError(e);
    }
  }

  @override
  Future<void> confirmPasswordReset({
    required String token,
    required String senha,
  }) async {
    try {
      await _api.confirmPasswordReset(token: token, senha: senha);
    } on DioException catch (e) {
      throw DioClient.unwrapError(e);
    }
  }

  @override
  Future<void> logout() async {
    final refreshToken = _storage.getRefreshToken();
    try {
      if (refreshToken != null && refreshToken.isNotEmpty) {
        await _api.logout(refreshToken: refreshToken);
      }
    } on DioException {
      // O logout local deve ocorrer mesmo sem conexao com a API.
    } finally {
      await _storage.clear();
    }
  }

  @override
  Future<String?> getToken() async => _storage.getToken();

  @override
  Future<User?> getCurrentUser() async => _storage.getUser();

  @override
  Future<void> saveSession(AuthResult result) async {
    await _storage.saveToken(result.token);
    final refreshToken = result.refreshToken;
    if (refreshToken != null && refreshToken.isNotEmpty) {
      await _storage.saveRefreshToken(refreshToken);
    }
    await persistUser(result.user);
  }

  @override
  Future<void> persistUser(User user) async {
    await _storage.saveUser(UserModel.fromUser(user));
  }

  @override
  Future<User> refreshProfile() async {
    try {
      final user = await _api.buscarMeuPerfil();
      await persistUser(user);
      return user;
    } on DioException catch (e) {
      throw DioClient.unwrapError(e);
    }
  }

  @override
  Future<User> updateProfile({
    String? nome,
    String? telefone,
    String? enderecoPrincipal,
    double? latitude,
    double? longitude,
    String? fotoUrl,
  }) async {
    try {
      final user = await _api.atualizarMeuPerfil(
        nome: nome,
        telefone: telefone,
        enderecoPrincipal: enderecoPrincipal,
        latitude: latitude,
        longitude: longitude,
        fotoUrl: fotoUrl,
      );
      await persistUser(user);
      return user;
    } on DioException catch (e) {
      throw DioClient.unwrapError(e);
    }
  }

  @override
  Future<String> uploadAvatar(String filePath) async {
    try {
      return await _api.uploadFotoPerfil(filePath);
    } on DioException catch (e) {
      throw DioClient.unwrapError(e);
    }
  }

  @override
  Future<String> uploadAvatarBytes({
    required List<int> bytes,
    required String filename,
  }) async {
    try {
      return await _api.uploadFotoPerfilBytes(
        bytes: Uint8List.fromList(bytes),
        filename: filename,
      );
    } on DioException catch (e) {
      throw DioClient.unwrapError(e);
    }
  }
}
