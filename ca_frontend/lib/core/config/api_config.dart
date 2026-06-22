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

  static const String authRegister = '$apiPrefix/auth/register';
  static const String authLogin = '$apiPrefix/auth/login';
  static const String authSocialLogin = '$apiPrefix/auth/social-login';
  static const String authMagicLink = '$apiPrefix/auth/magic-link';
  static const String authRegisterLegacy = '$apiPrefix/usuarios/registro';
  static const String authLoginLegacy = '$apiPrefix/usuarios/login';
  static const String usuariosMe = '$apiPrefix/usuarios/me';
  static const String upload = '$apiPrefix/upload';
  static const String prestadores = '$apiPrefix/profissionais';
  static const String prestadoresBusca = '$apiPrefix/perfil/busca';
  static const String perfil = '$apiPrefix/perfil';
  static const String perfilMeu = '$apiPrefix/perfil/meu-perfil';
  static const String servicos = '$apiPrefix/servicos';
  static const String chamados = '$apiPrefix/solicitacoes';
  static const String chamadosMeus = '$apiPrefix/solicitacoes/meus-pedidos';
  static const String chamadosCliente =
      '$apiPrefix/solicitacoes/minhas-solicitacoes';
  static const String avaliacoes = '$apiPrefix/avaliacoes';
  static const String categorias = '$apiPrefix/categorias';
  static const String adminCategorias = '$apiPrefix/admin/categorias';
  static const String adminRelatorios = '$apiPrefix/admin/relatorios';
  static const String status = '$apiPrefix/status';

  static String servicoStatus(int id) => '$servicos/$id/status';
  static String chamadoStatus(int id) => '$chamados/$id/status';
  static String avaliacoesProfissional(int id) =>
      '$avaliacoes/profissional/$id';

  static Duration get connectTimeout => const Duration(seconds: 15);
  static Duration get receiveTimeout => const Duration(seconds: 20);

  static String resolveAssetUrl(String? path) {
    if (path == null || path.isEmpty) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return '$baseUrl$path';
  }
}
