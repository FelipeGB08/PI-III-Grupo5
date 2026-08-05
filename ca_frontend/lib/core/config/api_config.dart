import 'package:flutter/foundation.dart';

import 'app_env.dart';

/// Configuração centralizada da API REST do Conecta AMAUC.
class ApiConfig {
  ApiConfig._();

  /// URL base resolvida automaticamente por plataforma:
  /// - Windows / Web / iOS Simulator → `localhost`
  /// - Android Emulator → `10.0.2.2`
  ///
  /// Dispositivo físico Android: use `--dart-define=API_BASE_URL=http://SEU_IP:3000`
  static String get baseUrl {
    return resolveBaseUrlForEnvironment(
      configured: AppEnv.apiBaseUrl,
      isWeb: kIsWeb,
      platform: defaultTargetPlatform,
      isRelease: kReleaseMode,
    );
  }

  static String resolveBaseUrlForEnvironment({
    required String configured,
    required bool isWeb,
    required TargetPlatform platform,
    required bool isRelease,
  }) {
    final value = configured.trim().replaceFirst(RegExp(r'/+$'), '');
    if (value.isNotEmpty) {
      final uri = Uri.tryParse(value);
      final isHttp = uri?.scheme == 'http' || uri?.scheme == 'https';
      final isOriginOnly = uri != null &&
          isHttp &&
          uri.host.isNotEmpty &&
          (uri.path.isEmpty || uri.path == '/') &&
          !uri.hasQuery &&
          !uri.hasFragment &&
          uri.userInfo.isEmpty;

      if (!isOriginOnly) {
        throw StateError(
          'API_BASE_URL deve conter somente uma origem HTTP(S) válida.',
        );
      }
      if (isRelease && uri.scheme != 'https') {
        throw StateError('API_BASE_URL deve usar HTTPS em builds release.');
      }
      return value;
    }

    if (isRelease) {
      throw StateError(
        'API_BASE_URL é obrigatória em builds release. '
        'Use --dart-define=API_BASE_URL=https://seu-backend.',
      );
    }

    if (isWeb) return 'http://localhost:3000';

    switch (platform) {
      case TargetPlatform.android:
        return 'http://10.0.2.2:3000';
      default:
        return 'http://localhost:3000';
    }
  }

  static const String apiPrefix = '/api/v1';

  static const String authRegister = '$apiPrefix/auth/register';
  static const String authLogin = '$apiPrefix/auth/login';
  static const String authSocialLogin = '$apiPrefix/auth/social-login';
  static const String authAppleConfig = '$apiPrefix/auth/apple/config';
  static const String authGithubAuthorize = '$apiPrefix/auth/github/authorize';
  static const String authGithubComplete = '$apiPrefix/auth/github/complete';
  static const String authRefresh = '$apiPrefix/auth/refresh';
  static const String authLogout = '$apiPrefix/auth/logout';
  static const String authMagicLink = '$apiPrefix/auth/magic-link';
  static const String authMagicLinkVerify = '$apiPrefix/auth/magic-link/verify';
  static const String authPasswordResetRequest =
      '$apiPrefix/auth/password-reset/request';
  static const String authPasswordResetConfirm =
      '$apiPrefix/auth/password-reset/confirm';
  static const String authRegisterLegacy = '$apiPrefix/usuarios/registro';
  static const String authLoginLegacy = '$apiPrefix/usuarios/login';
  static const String usuariosMe = '$apiPrefix/usuarios/me';
  static const String upload = '$apiPrefix/upload';
  static const String dispositivoToken = '$apiPrefix/dispositivos/token';
  static const String notificacoes = '$apiPrefix/notificacoes';
  static const String notificacoesPreferencias = '$notificacoes/preferencias';
  static const String prestadores = '$apiPrefix/profissionais';
  static const String prestadoresBusca = '$apiPrefix/perfil/busca';
  static const String perfil = '$apiPrefix/perfil';
  static const String perfilMeu = '$apiPrefix/perfil/meu-perfil';
  static const String perfilConta = '$apiPrefix/perfil/conta';
  static const String perfilVerificacao = '$apiPrefix/perfil/verificacao';
  static const String perfilVerificacaoDocumento =
      '$perfilVerificacao/documento';
  static const String agendaMe = '$apiPrefix/agenda/me';
  static const String servicos = '$apiPrefix/servicos';
  static const String chamados = '$apiPrefix/solicitacoes';
  static const String chamadosCliente = '$apiPrefix/solicitacoes/meus-pedidos';
  static const String chamadosPrestador =
      '$apiPrefix/solicitacoes/minhas-solicitacoes';
  static const String financeiro = '$apiPrefix/solicitacoes/financeiro';
  static const String conversas = '$apiPrefix/solicitacoes/conversas';
  static const String avaliacoes = '$apiPrefix/avaliacoes';
  static const String avaliacoesClientes = '$avaliacoes/cliente';
  static const String categorias = '$apiPrefix/categorias';
  static const String adminCategorias = '$apiPrefix/admin/categorias';
  static const String adminRelatorios = '$apiPrefix/admin/relatorios';
  static const String adminRelatoriosExport = '$adminRelatorios/export';
  static const String adminVerificacoes = '$apiPrefix/admin/verificacoes';
  static const String adminDenuncias = '$apiPrefix/admin/denuncias';
  static const String adminUsuarios = '$apiPrefix/admin/usuarios';
  static const String status = '$apiPrefix/status';

  static String servicoStatus(int id) => '$servicos/$id/status';
  static String chamadoDetalhe(int id) => '$chamados/$id';
  static String chamadoStatus(int id) => '$chamados/$id/status';
  static String denunciarChamado(int id) => '$chamados/$id/denuncia';
  static String confirmarConclusao(int id) =>
      '$chamados/$id/confirmar-conclusao';
  static String propostaValor(int id) => '$chamados/$id/proposta-valor';
  static String aceitarPropostaValor(int id) =>
      '$chamados/$id/proposta-valor/aceitar';
  static String recusarPropostaValor(int id) =>
      '$chamados/$id/proposta-valor/recusar';
  static String fotosConclusaoSolicitacao(int id) =>
      '$chamados/$id/fotos-conclusao';
  static String cancelarSolicitacao(int id) => '$chamados/$id/cancelar';
  static String remarcarSolicitacao(int id) => '$chamados/$id/remarcar';
  static String aceitarRemarcacao(int id) => '$chamados/$id/remarcacao/aceitar';
  static String recusarRemarcacao(int id) => '$chamados/$id/remarcacao/recusar';
  static String notificacaoLida(int id) => '$notificacoes/$id/lida';
  static String notificacoesLidas() => '$notificacoes/lidas';
  static String agendaProfissional(int id) =>
      '$apiPrefix/agenda/profissionais/$id';
  static String avaliacoesProfissional(int id) =>
      '$avaliacoes/profissional/$id';
  static String adminDocumentoVerificacao(int perfilId) =>
      '$adminVerificacoes/$perfilId/documento';
  static String aprovarVerificacao(int perfilId) =>
      '$adminVerificacoes/$perfilId/aprovar';
  static String rejeitarVerificacao(int perfilId) =>
      '$adminVerificacoes/$perfilId/rejeitar';
  static String denunciaAdmin(int denunciaId) => '$adminDenuncias/$denunciaId';
  static String statusUsuarioAdmin(int usuarioId) =>
      '$adminUsuarios/$usuarioId/status';

  static Uri githubOAuthAuthorizeUri({
    required String platform,
    required String cidadeAmauc,
    required String state,
  }) {
    return Uri.parse('$baseUrl$authGithubAuthorize').replace(
      queryParameters: {
        'platform': platform,
        'cidade_amauc': cidadeAmauc,
        'state': state,
      },
    );
  }

  static Duration get connectTimeout => const Duration(seconds: 15);
  static Duration get receiveTimeout => const Duration(seconds: 20);

  static String resolveAssetUrl(String? path) {
    if (path == null || path.isEmpty) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return '$baseUrl$path';
  }

  static bool isTrustedApiUrl(String url) {
    final target = Uri.tryParse(resolveAssetUrl(url));
    final api = Uri.tryParse(baseUrl);
    if (target == null || api == null) return false;
    int port(Uri uri) => uri.hasPort
        ? uri.port
        : (uri.scheme.toLowerCase() == 'https' ? 443 : 80);
    return target.scheme.toLowerCase() == api.scheme.toLowerCase() &&
        target.host.toLowerCase() == api.host.toLowerCase() &&
        port(target) == port(api);
  }
}
