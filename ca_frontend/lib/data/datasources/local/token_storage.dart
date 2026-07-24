import 'dart:async';
import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../models/user_model.dart';

abstract interface class SecureTokenStore {
  Future<String?> read(String key);
  Future<void> write(String key, String value);
  Future<void> delete(String key);
}

class FlutterSecureTokenStore implements SecureTokenStore {
  FlutterSecureTokenStore({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  @override
  Future<String?> read(String key) => _storage.read(key: key);

  @override
  Future<void> write(String key, String value) =>
      _storage.write(key: key, value: value);

  @override
  Future<void> delete(String key) => _storage.delete(key: key);
}

/// Mantém tokens somente no armazenamento seguro e usa SharedPreferences para
/// preferências e dados não sensíveis. Os getters são síncronos porque os
/// valores ficam em memória após [initialize], antes de o app ser iniciado.
class TokenStorage {
  TokenStorage(this._prefs, {SecureTokenStore? secureTokenStore})
      : _secureTokenStore = secureTokenStore ?? FlutterSecureTokenStore();

  final SharedPreferences _prefs;
  final SecureTokenStore _secureTokenStore;

  static const _tokenKey = 'auth_token';
  static const _refreshTokenKey = 'auth_refresh_token';
  static const _userKey = 'auth_user';

  Future<void>? _initialization;
  String? _accessToken;
  String? _refreshToken;
  final _accessTokenChanges = StreamController<String?>.broadcast(sync: true);

  Stream<String?> get accessTokenChanges => _accessTokenChanges.stream;

  Future<void> initialize() => _initialization ??= _initialize();

  Future<void> _initialize() async {
    final secureAccessToken = _normalizarToken(
      await _secureTokenStore.read(_tokenKey),
    );
    final secureRefreshToken = _normalizarToken(
      await _secureTokenStore.read(_refreshTokenKey),
    );
    final legacyAccessToken = _normalizarToken(_prefs.getString(_tokenKey));
    final legacyRefreshToken =
        _normalizarToken(_prefs.getString(_refreshTokenKey));

    _accessToken = secureAccessToken ?? legacyAccessToken;
    _refreshToken = secureRefreshToken ?? legacyRefreshToken;

    if (secureAccessToken == null && legacyAccessToken != null) {
      await _secureTokenStore.write(_tokenKey, legacyAccessToken);
    }
    if (secureRefreshToken == null && legacyRefreshToken != null) {
      await _secureTokenStore.write(_refreshTokenKey, legacyRefreshToken);
    }

    // Remove cópias legadas somente depois de a migração para o cofre seguro
    // ter sido concluída. Assim, nenhum token permanece em SharedPreferences.
    await _prefs.remove(_tokenKey);
    await _prefs.remove(_refreshTokenKey);
    await _prefs.remove('chamados_cliente_cache');
  }

  String? _normalizarToken(String? token) {
    final valor = token?.trim();
    return valor == null || valor.isEmpty ? null : valor;
  }

  String? getToken() => _accessToken;

  Future<void> saveToken(String token) async {
    await initialize();
    final valor = _normalizarToken(token);
    final tokenAnterior = _accessToken;
    if (valor == null) {
      await _secureTokenStore.delete(_tokenKey);
    } else {
      await _secureTokenStore.write(_tokenKey, valor);
    }
    _accessToken = valor;
    if (tokenAnterior != valor && !_accessTokenChanges.isClosed) {
      _accessTokenChanges.add(valor);
    }
  }

  String? getRefreshToken() => _refreshToken;

  Future<void> saveRefreshToken(String token) async {
    await initialize();
    final valor = _normalizarToken(token);
    if (valor == null) {
      await _secureTokenStore.delete(_refreshTokenKey);
    } else {
      await _secureTokenStore.write(_refreshTokenKey, valor);
    }
    _refreshToken = valor;
  }

  Future<void> saveUser(UserModel user) =>
      _prefs.setString(_userKey, jsonEncode(user.toJson()));

  UserModel? getUser() {
    final raw = _prefs.getString(_userKey);
    if (raw == null) return null;
    return UserModel.fromJson(jsonDecode(raw) as Map<String, dynamic>);
  }

  Future<void> clear() async {
    final tinhaAccessToken = _accessToken != null;
    _accessToken = null;
    _refreshToken = null;

    await initialize();
    _accessToken = null;
    _refreshToken = null;
    await Future.wait([
      _secureTokenStore.delete(_tokenKey),
      _secureTokenStore.delete(_refreshTokenKey),
      _prefs.remove(_tokenKey),
      _prefs.remove(_refreshTokenKey),
      _prefs.remove(_userKey),
      _prefs.remove('chamados_cliente_cache'),
    ]);
    if (tinhaAccessToken && !_accessTokenChanges.isClosed) {
      _accessTokenChanges.add(null);
    }
  }

  void dispose() {
    unawaited(_accessTokenChanges.close());
  }
}
