import 'package:ca_frontend/domain/entities/prestador.dart';
import 'package:ca_frontend/presentation/providers/providers.dart';
import 'package:ca_frontend/presentation/screens/cliente/cliente_dashboard_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../helpers/fakes.dart';

void main() {
  testWidgets('abre filtros avancados e aplica faixa de preco', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final repository = FakePrestadorRepository(const [
      Prestador(
        id: 9,
        nome: 'Carlos Eletricista',
        cidade: 'Concordia',
        categoria: 'Eletricista',
      ),
    ]);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          prestadorRepositoryProvider.overrideWithValue(repository),
        ],
        child: const MaterialApp(
          home: Scaffold(body: ClienteDashboardScreen()),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Filtros avancados'));
    await tester.pumpAndSettle();

    expect(find.text('Preco minimo'), findsOneWidget);
    expect(find.text('Preco maximo'), findsOneWidget);
    expect(
      find.text('Filtrar por disponibilidade em uma data'),
      findsOneWidget,
    );

    await tester.enterText(find.byType(TextField).at(1), '80');
    await tester.enterText(find.byType(TextField).at(2), '250');
    await tester.tap(find.text('Aplicar filtros'));
    await tester.pumpAndSettle();

    expect(repository.lastPrecoMinimo, 80);
    expect(repository.lastPrecoMaximo, 250);
    expect(find.text('R\$ 80 a R\$ 250'), findsOneWidget);
  });
}
