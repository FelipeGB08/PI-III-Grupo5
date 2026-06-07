import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:ca_frontend/presentation/providers/providers.dart';
import 'package:ca_frontend/presentation/screens/auth/welcome_auth_screen.dart';

void main() {
  testWidgets('renderiza tela de boas-vindas do Conecta AMAUC', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
        ],
        child: const MaterialApp(home: WelcomeAuthScreen()),
      ),
    );

    expect(find.text('Conecta AMAUC'), findsOneWidget);
    expect(find.text('Cadastrar'), findsOneWidget);

    await tester.tap(find.text('Cadastrar'));
    await tester.pumpAndSettle();

    expect(find.text('Quero Contratar'), findsOneWidget);
    expect(find.text('Quero Trabalhar'), findsOneWidget);
  });
}
