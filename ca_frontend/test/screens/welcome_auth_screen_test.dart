import 'package:ca_frontend/domain/entities/user.dart';
import 'package:ca_frontend/presentation/providers/providers.dart';
import 'package:ca_frontend/presentation/screens/auth/welcome_auth_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../helpers/fakes.dart';

void main() {
  testWidgets('faz login com credenciais usando repositorio falso',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final user = User(
      id: 1,
      nome: 'Ana Cliente',
      email: 'ana@teste.com',
      tipo: UserTipo.cidadao,
    );
    final authRepository = FakeAuthRepository(user);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          authStateProvider.overrideWith(
            (ref) => AuthNotifier(
              authRepository,
              initialState: const AuthState(),
            ),
          ),
        ],
        child: const MaterialApp(home: WelcomeAuthScreen()),
      ),
    );
    await tester.pumpAndSettle();
    final semantics = tester.ensureSemantics();

    expect(find.text('Bem-vindo de volta'), findsOneWidget);
    expect(find.text('Com senha'), findsOneWidget);
    expect(find.text('Criar conta'), findsOneWidget);
    expect(find.bySemanticsLabel(RegExp('E-mail')), findsAtLeastNWidgets(1));
    expect(find.bySemanticsLabel(RegExp('Senha')), findsAtLeastNWidgets(1));
    expect(find.bySemanticsLabel('Entrar com senha'), findsOneWidget);
    expect(
      find.bySemanticsLabel('Entrar sem senha com magic link'),
      findsOneWidget,
    );

    final fields = find.byType(TextFormField);
    expect(fields, findsNWidgets(2));
    await tester.enterText(fields.at(0), '  ana@teste.com  ');
    await tester.enterText(fields.at(1), 'senha123');

    final continueButton = find.widgetWithText(ElevatedButton, 'Continuar');
    await tester.ensureVisible(continueButton);
    await tester.tap(continueButton);
    await tester.pumpAndSettle();

    expect(authRepository.loginEmail, 'ana@teste.com');
    expect(authRepository.loginSenha, 'senha123');
    expect(find.text('Login realizado com sucesso!'), findsOneWidget);
    semantics.dispose();
  });
}
