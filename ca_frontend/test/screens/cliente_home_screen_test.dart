import 'package:ca_frontend/core/config/amauc_constants.dart';
import 'package:ca_frontend/domain/entities/prestador.dart';
import 'package:ca_frontend/domain/entities/user.dart';
import 'package:ca_frontend/presentation/providers/providers.dart';
import 'package:ca_frontend/presentation/screens/cliente/cliente_home_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../helpers/fakes.dart';

void main() {
  testWidgets('lista prestador e filtra por categoria sem acessar a rede',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final user = User(
      id: 1,
      nome: 'Ana Cliente',
      email: 'ana@teste.com',
      tipo: UserTipo.cidadao,
      cidadeAmauc: 'Concordia',
    );
    final authRepository = FakeAuthRepository(user);
    final prestadorRepository = FakePrestadorRepository(
      const [
        Prestador(
          id: 9,
          nome: 'Carlos Eletricista',
          cidade: 'Concordia',
          categoria: 'Eletricista',
          mediaAvaliacao: 4.8,
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          authStateProvider.overrideWith(
            (ref) => AuthNotifier(
              authRepository,
              initialState: AuthState(user: user),
            ),
          ),
          prestadorRepositoryProvider.overrideWithValue(prestadorRepository),
        ],
        child: const MaterialApp(
          home: Scaffold(body: ClienteHomeScreen()),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Ola, Ana'), findsOneWidget);
    expect(find.text('Categorias'), findsOneWidget);

    final categoria = AmaucConstants.categorias.first;
    final categoryTile = find.text(categoria.nome);
    await tester.ensureVisible(categoryTile);
    await tester.tap(categoryTile);
    await tester.pumpAndSettle();

    expect(prestadorRepository.lastCategoria, categoria.id);
    expect(prestadorRepository.listarCalls, greaterThanOrEqualTo(2));

    await tester.drag(find.byType(ListView).first, const Offset(0, -500));
    await tester.pumpAndSettle();
    expect(find.text('Perto de mim'), findsOneWidget);
    expect(find.text('Carlos Eletricista'), findsOneWidget);
  });
}
