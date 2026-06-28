import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppEnv {
  AppEnv._();

  static const _apiBaseUrlDefine = String.fromEnvironment('API_BASE_URL');
  static const _googleClientIdDefine =
      String.fromEnvironment('GOOGLE_CLIENT_ID');
  static const _googleServerClientIdDefine =
      String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID');
  static const _appleClientIdDefine = String.fromEnvironment('APPLE_CLIENT_ID');
  static const _appleRedirectUriDefine =
      String.fromEnvironment('APPLE_REDIRECT_URI');

  static Future<void> load() async {
    try {
      await dotenv.load(fileName: 'assets/env/app.env');
    } catch (_) {
      // Arquivo opcional para testes automatizados e builds sem config local.
    }
  }

  static String get apiBaseUrl => _resolve('API_BASE_URL', _apiBaseUrlDefine);

  static String get googleClientId =>
      _resolve('GOOGLE_CLIENT_ID', _googleClientIdDefine);

  static String get googleServerClientId =>
      _resolve('GOOGLE_SERVER_CLIENT_ID', _googleServerClientIdDefine);

  static String get appleClientId =>
      _resolve('APPLE_CLIENT_ID', _appleClientIdDefine);

  static String get appleRedirectUri =>
      _resolve('APPLE_REDIRECT_URI', _appleRedirectUriDefine);

  static String _resolve(String key, String defineValue) {
    if (defineValue.isNotEmpty) return defineValue;
    if (!dotenv.isInitialized) return '';
    return dotenv.maybeGet(key) ?? '';
  }
}
