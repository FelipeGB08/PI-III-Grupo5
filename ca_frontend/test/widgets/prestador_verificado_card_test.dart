import 'package:ca_frontend/domain/entities/prestador.dart';
import 'package:ca_frontend/presentation/widgets/prestador_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('card de busca mostra somente o selo publico de verificado',
      (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: PrestadorCard(
            prestador: const Prestador(
              id: 8,
              nome: 'Ana Profissional',
              cidade: 'Concordia',
              categorias: ['TI'],
              verificado: true,
            ),
            onTap: _noop,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Profissional verificado'), findsOneWidget);
    expect(find.byIcon(Icons.verified_rounded), findsOneWidget);
    expect(find.textContaining('documento'), findsNothing);
  });
}

void _noop() {}
