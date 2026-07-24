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
  testWidgets('prestador aceita e abre detalhes para enviar evidencias',
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

    expect(find.text('Detalhes do Agendamento'), findsOneWidget);
    expect(find.text('Concluir Servico'), findsOneWidget);
    expect(chamadoRepository.lastStatus, ChamadoStatus.emAndamento);
    expect(
      chamadoRepository.chamados.single.status,
      ChamadoStatus.emAndamento,
    );
  });

  testWidgets('carrega a proxima pagina de chamados sob demanda',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final user = User(
      id: 9,
      nome: 'Carlos Prestador',
      email: 'carlos@teste.com',
      tipo: UserTipo.profissional,
    );
    final chamadoRepository = FakeChamadoRepository(
      List.generate(
        21,
        (index) => Chamado(
          id: index + 1,
          descricao: 'Chamado ${index + 1}',
          status: ChamadoStatus.pendente,
          profissionalId: 9,
          cidadaoId: index + 100,
          cidadaoNome: 'Cliente ${index + 1}',
          servicoNome: 'Servico ${index + 1}',
        ),
      ),
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
          chamadoRepositoryProvider.overrideWithValue(chamadoRepository),
        ],
        child: const MaterialApp(
          home: Scaffold(body: ChamadosScreen()),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Servico 21'), findsNothing);
    await tester.scrollUntilVisible(
      find.text('Carregar mais'),
      500,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.tap(find.text('Carregar mais'));
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.text('Servico 21'),
      500,
      scrollable: find.byType(Scrollable).last,
    );
    expect(find.text('Servico 21'), findsOneWidget);
    expect(find.text('Carregar mais'), findsNothing);
  });
}
