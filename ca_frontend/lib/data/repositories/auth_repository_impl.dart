import 'package:dio/dio.dart';

import '../../core/config/amauc_constants.dart';
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
      final result = AuthResult(token: response.token, user: response.user);
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

    if (params.tipo.isPrestador &&
        params.cidades.isNotEmpty &&
        params.categorias.isNotEmpty) {
      final loginResult = await login(email: params.email, senha: params.senha);
      await _api.criarPerfilProfissional(
        bio: params.bio ?? 'Profissional autônomo na região AMAUC.',
        telefoneComercial: params.telefoneComercial ?? '',
        cidade: params.cidades.first,
        categoria: AmaucConstants.categoriaNomePorId(params.categorias.first) ??
            params.categorias.first,
      );
      return loginResult;
    }

    return login(email: params.email, senha: params.senha);
  }

  @override
  Future<void> logout() => _storage.clear();

  @override
  Future<String?> getToken() async => _storage.getToken();

  @override
  Future<User?> getCurrentUser() async => _storage.getUser();

  @override
  Future<void> saveSession(AuthResult result) async {
    await _storage.saveToken(result.token);
    await _storage.saveUser(UserModel(
      id: result.user.id,
      nome: result.user.nome,
      email: result.user.email,
      tipo: result.user.tipo,
    ));
  }
}
