import 'package:flutter/foundation.dart';

/// Configuração centralizada da API REST do Conecta AMAUC.
class ApiConfig {
  ApiConfig._();

  /// URL base resolvida automaticamente por plataforma:
  /// - Windows / Web / iOS Simulator → `localhost`
  /// - Android Emulator → `10.0.2.2`
  ///
  /// Dispositivo físico Android: use `--dart-define=API_BASE_URL=http://SEU_IP:3000`
  static String get baseUrl {
    const fromEnv = String.fromEnvironment('API_BASE_URL');
    if (fromEnv.isNotEmpty) return fromEnv;

    if (kIsWeb) return 'http://localhost:3000';

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return 'http://10.0.2.2:3000';
      default:
        return 'http://localhost:3000';
    }
  }

  static const String apiPrefix = '/api';

  static const String authRegister = '$apiPrefix/usuarios/registro';
  static const String authLogin = '$apiPrefix/usuarios/login';
  static const String prestadores = '$apiPrefix/profissionais';
  static const String prestadoresBusca = '$apiPrefix/perfil/busca';
  static const String perfil = '$apiPrefix/perfil';
  static const String perfilMeu = '$apiPrefix/perfil/meu-perfil';
  static const String chamados = '$apiPrefix/solicitacoes';
  static const String chamadosMeus = '$apiPrefix/solicitacoes/meus-pedidos';
  static const String chamadosCliente = '$apiPrefix/solicitacoes/minhas-solicitacoes';
  static const String avaliacoes = '$apiPrefix/avaliacoes';
  static const String categorias = '$apiPrefix/categorias';
  static const String status = '$apiPrefix/status';

  static String chamadoStatus(int id) => '$chamados/$id/status';
  static String avaliacoesProfissional(int id) =>
      '$avaliacoes/profissional/$id';

  static Duration get connectTimeout => const Duration(seconds: 15);
  static Duration get receiveTimeout => const Duration(seconds: 20);
}
