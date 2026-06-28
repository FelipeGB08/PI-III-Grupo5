import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'core/config/app_env.dart';
import 'data/datasources/local/token_storage.dart';
import 'presentation/providers/providers.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppEnv.load();

  final prefs = await SharedPreferences.getInstance();
  final storage = TokenStorage(prefs);
  final initialAuth = buildInitialAuthState(storage);

  runApp(
    ProviderScope(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        authStateProvider.overrideWith(
          (ref) => AuthNotifier(
            ref.watch(authRepositoryProvider),
            initialState: initialAuth,
          ),
        ),
      ],
      child: const ConectaAmaucApp(),
    ),
  );
}
