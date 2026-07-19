import 'package:ca_frontend/domain/entities/prestador.dart';
import 'package:ca_frontend/presentation/providers/providers.dart';
import 'package:ca_frontend/presentation/screens/favoritos/favoritos_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../helpers/fakes.dart';

void main() {
  testWidgets('carrega mais favoritos sem acessar a rede', (tester) async {
    final prestadores = List.generate(
      21,
      (index) => Prestador(
        id: index + 1,
        nome: 'Profissional ${index + 1}',
        cidade: 'Concordia',
        categoria: 'Eletricista',
      ),
    );
    SharedPreferences.setMockInitialValues({
      'favoritos_profissionais':
          prestadores.map((prestador) => prestador.id.toString()).toList(),
    });
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getStringList('favoritos_profissionais'), hasLength(21));

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          prestadorRepositoryProvider.overrideWithValue(
            FakePrestadorRepository(prestadores),
          ),
        ],
        child: const MaterialApp(
          home: Scaffold(body: FavoritosScreen()),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final container = ProviderScope.containerOf(
      tester.element(find.byType(FavoritosScreen)),
    );
    expect(container.read(favoritosProvider), hasLength(21));
    expect(container.read(prestadoresProvider).prestadores, hasLength(21));
    expect(find.text('Favoritos'), findsOneWidget);
    expect(find.text('Profissional 1'), findsOneWidget);
    for (var tentativa = 0;
        tentativa < 10 && find.text('Carregar mais').evaluate().isEmpty;
        tentativa++) {
      await tester.drag(find.byType(ListView), const Offset(0, -500));
      await tester.pumpAndSettle();
    }
    expect(find.text('Carregar mais'), findsOneWidget);
    expect(find.text('Profissional 21'), findsNothing);
    await tester.tap(find.text('Carregar mais'));
    await tester.pumpAndSettle();

    for (var tentativa = 0;
        tentativa < 3 && find.text('Profissional 21').evaluate().isEmpty;
        tentativa++) {
      await tester.drag(find.byType(ListView), const Offset(0, -300));
      await tester.pumpAndSettle();
    }
    expect(find.text('Profissional 21'), findsOneWidget);
    expect(find.text('Carregar mais'), findsNothing);
  });
}
