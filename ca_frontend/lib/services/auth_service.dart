import 'package:dio/dio.dart';

import '../core/config/api_config.dart';
import '../core/network/dio_client.dart';
import '../data/models/user_model.dart';
import '../domain/repositories/auth_repository.dart';

/// Serviço HTTP de autenticação (RF01 — geofencing no cadastro).
class AuthService {
  AuthService(this._dio);

  final Dio _dio;

  Future<AuthResponseModel> login({
    required String email,
    required String senha,
  }) async {
    try {
      final response = await _dio.post(
        ApiConfig.authLogin,
        data: {'email': email, 'senha': senha},
      );
      return AuthResponseModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw DioClient.unwrapError(e);
    }
  }

  Future<Map<String, dynamic>> register({
    required String nome,
    required String email,
    required String senha,
    required String cidadeAmauc,
    required String perfilTipo,
    String? telefone,
  }) async {
    try {
      final response = await _dio.post(
        ApiConfig.authRegister,
        data: {
          'nome': nome,
          'email': email,
          'senha': senha,
          'telefone': telefone ?? '',
          'cidade_amauc': cidadeAmauc,
          'perfil_tipo': perfilTipo,
        },
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw DioClient.unwrapError(e);
    }
  }

  Future<AuthResponseModel> registerAndLogin(RegisterParams params) async {
    final cidade = params.cidades.isNotEmpty ? params.cidades.first : '';
    await register(
      nome: params.nome,
      email: params.email,
      senha: params.senha,
      cidadeAmauc: cidade,
      perfilTipo: params.tipo.name,
      telefone: params.telefoneComercial,
    );
    return login(email: params.email, senha: params.senha);
  }
}
