import 'package:ca_frontend/data/datasources/local/token_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _MemorySecureTokenStore implements SecureTokenStore {
  final Map<String, String> values = {};

  @override
  Future<void> delete(String key) async {
    values.remove(key);
  }

  @override
  Future<String?> read(String key) async => values[key];

  @override
  Future<void> write(String key, String value) async {
    values[key] = value;
  }
}

void main() {
  test(
      'migra tokens legados para armazenamento seguro e remove SharedPreferences',
      () async {
    SharedPreferences.setMockInitialValues({
      'auth_token': 'access-legado',
      'auth_refresh_token': 'refresh-legado',
      'auth_user': '{"id":1}',
    });
    final prefs = await SharedPreferences.getInstance();
    final secureStore = _MemorySecureTokenStore();
    final storage = TokenStorage(prefs, secureTokenStore: secureStore);

    await storage.initialize();

    expect(storage.getToken(), 'access-legado');
    expect(storage.getRefreshToken(), 'refresh-legado');
    expect(secureStore.values, {
      'auth_token': 'access-legado',
      'auth_refresh_token': 'refresh-legado',
    });
    expect(prefs.containsKey('auth_token'), isFalse);
    expect(prefs.containsKey('auth_refresh_token'), isFalse);
  });

  test('salva tokens novos apenas no cofre seguro e limpa sessão e cache',
      () async {
    SharedPreferences.setMockInitialValues({
      'auth_user': '{"id":1}',
      'chamados_cliente_cache': '[]',
    });
    final prefs = await SharedPreferences.getInstance();
    final secureStore = _MemorySecureTokenStore();
    final storage = TokenStorage(prefs, secureTokenStore: secureStore);

    await storage.initialize();
    await storage.saveToken('access-seguro');
    await storage.saveRefreshToken('refresh-seguro');

    expect(storage.getToken(), 'access-seguro');
    expect(storage.getRefreshToken(), 'refresh-seguro');
    expect(prefs.containsKey('auth_token'), isFalse);
    expect(prefs.containsKey('auth_refresh_token'), isFalse);

    await storage.clear();

    expect(storage.getToken(), isNull);
    expect(storage.getRefreshToken(), isNull);
    expect(secureStore.values, isEmpty);
    expect(prefs.containsKey('auth_user'), isFalse);
    expect(prefs.containsKey('chamados_cliente_cache'), isFalse);
  });

  test('notifica troca e remocao do access token para conexoes em tempo real',
      () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final storage = TokenStorage(
      prefs,
      secureTokenStore: _MemorySecureTokenStore(),
    );
    addTearDown(storage.dispose);
    await storage.initialize();

    final alteracoes = <String?>[];
    final subscription = storage.accessTokenChanges.listen(alteracoes.add);
    addTearDown(subscription.cancel);

    await storage.saveToken('access-1');
    await storage.saveToken('access-2');
    await storage.clear();

    expect(alteracoes, ['access-1', 'access-2', null]);
  });
}
