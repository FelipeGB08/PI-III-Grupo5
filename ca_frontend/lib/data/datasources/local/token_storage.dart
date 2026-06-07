import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../models/user_model.dart';

class TokenStorage {
  TokenStorage(this._prefs);

  final SharedPreferences _prefs;

  static const _tokenKey = 'auth_token';
  static const _userKey = 'auth_user';
  static const _chamadosClienteKey = 'chamados_cliente_cache';

  String? getToken() => _prefs.getString(_tokenKey);

  Future<void> saveToken(String token) => _prefs.setString(_tokenKey, token);

  Future<void> saveUser(UserModel user) =>
      _prefs.setString(_userKey, jsonEncode(user.toJson()));

  UserModel? getUser() {
    final raw = _prefs.getString(_userKey);
    if (raw == null) return null;
    return UserModel.fromJson(jsonDecode(raw) as Map<String, dynamic>);
  }

  Future<void> clear() async {
    await _prefs.remove(_tokenKey);
    await _prefs.remove(_userKey);
  }

  Future<void> cacheChamadosCliente(List<Map<String, dynamic>> chamados) =>
      _prefs.setString(_chamadosClienteKey, jsonEncode(chamados));

  List<Map<String, dynamic>> getChamadosClienteCache() {
    final raw = _prefs.getString(_chamadosClienteKey);
    if (raw == null) return [];
    return (jsonDecode(raw) as List<dynamic>)
        .map((e) => e as Map<String, dynamic>)
        .toList();
  }
}
