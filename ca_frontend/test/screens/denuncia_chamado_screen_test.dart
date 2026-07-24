import 'package:ca_frontend/domain/entities/chamado.dart';
import 'package:ca_frontend/domain/entities/user.dart';
import 'package:ca_frontend/presentation/providers/providers.dart';
import 'package:ca_frontend/presentation/screens/agendamentos/agendamento_detalhes_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../helpers/fakes.dart';

void main() {
  testWidgets(
      'participante abre o formulario para reportar problema no chamado',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final user = User(
      id: 1,
      nome: 'Ana Cliente',
      email: 'ana@teste.com',
      tipo: UserTipo.cidadao,
    );
    const chamado = Chamado(
      id: 44,
      descricao: 'Servico: Instalacao eletrica',
      status: ChamadoStatus.emAndamento,
      profissionalId: 9,
      cidadaoId: 1,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          authStateProvider.overrideWith(
            (ref) => AuthNotifier(
              FakeAuthRepository(user),
              initialState: AuthState(user: user),
            ),
          ),
          chamadoRepositoryProvider
              .overrideWithValue(FakeChamadoRepository([chamado])),
        ],
        child: const MaterialApp(
          home: AgendamentoDetalhesScreen(chamado: chamado),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final reportar = find.byKey(const Key('reportar-problema-button'));
    await tester.scrollUntilVisible(reportar, 300);
    await tester.tap(reportar);
    await tester.pumpAndSettle();

    final dialogo = find.byType(AlertDialog);
    expect(dialogo, findsOneWidget);
    expect(
      find.descendant(of: dialogo, matching: find.text('Reportar problema')),
      findsOneWidget,
    );
    expect(find.byKey(const Key('descricao-denuncia-field')), findsOneWidget);
    await tester.enterText(
      find.byKey(const Key('descricao-denuncia-field')),
      'O profissional nao compareceu ao horario combinado.',
    );
    expect(find.byKey(const Key('enviar-denuncia-button')), findsOneWidget);
  });
}
