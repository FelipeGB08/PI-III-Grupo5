import 'package:ca_frontend/domain/entities/chamado.dart';
import 'package:ca_frontend/domain/entities/user.dart';
import 'package:ca_frontend/presentation/providers/providers.dart';
import 'package:ca_frontend/presentation/screens/chamados/chamados_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../helpers/fakes.dart';

void main() {
  testWidgets('prestador aceita e conclui um chamado usando repositorio falso',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final user = User(
      id: 9,
      nome: 'Carlos Prestador',
      email: 'carlos@teste.com',
      tipo: UserTipo.profissional,
    );
    final authRepository = FakeAuthRepository(user);
    final chamadoRepository = FakeChamadoRepository(
      const [
        Chamado(
          id: 42,
          descricao: 'Servico: Instalacao eletrica',
          status: ChamadoStatus.pendente,
          profissionalId: 9,
          cidadaoId: 1,
          cidadaoNome: 'Ana Cliente',
          servicoNome: 'Instalacao eletrica',
          preco: 120,
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
          chamadoRepositoryProvider.overrideWithValue(chamadoRepository),
        ],
        child: const MaterialApp(
          home: Scaffold(body: ChamadosScreen()),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Agendamentos'), findsOneWidget);
    expect(find.text('Instalacao eletrica'), findsOneWidget);
    expect(find.text('Aceitar'), findsOneWidget);

    await tester.tap(find.text('Aceitar'));
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pumpAndSettle();

    expect(chamadoRepository.lastStatus, ChamadoStatus.emAndamento);
    expect(chamadoRepository.lastListWasForPrestador, isTrue);

    await tester.tap(find.text('Confirmados'));
    await tester.pumpAndSettle();
    expect(find.text('Marcar como concluido'), findsOneWidget);

    await tester.tap(find.text('Marcar como concluido'));
    await tester.pumpAndSettle();

    expect(chamadoRepository.lastStatus, ChamadoStatus.concluido);
    expect(chamadoRepository.chamados.single.status, ChamadoStatus.concluido);
  });
}
