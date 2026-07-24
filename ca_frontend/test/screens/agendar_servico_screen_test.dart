import 'package:ca_frontend/domain/entities/agenda_config.dart';
import 'package:ca_frontend/domain/entities/prestador.dart';
import 'package:ca_frontend/domain/entities/user.dart';
import 'package:ca_frontend/presentation/providers/providers.dart';
import 'package:ca_frontend/presentation/screens/agendamentos/agendar_servico_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../helpers/fakes.dart';

void main() {
  testWidgets('confirma agendamento usando agenda e chamado falsos',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    const prestador = Prestador(
      id: 9,
      nome: 'Carlos Eletricista',
      cidade: 'Concordia',
      categoria: 'Eletricista',
    );
    final user = User(
      id: 1,
      nome: 'Ana Cliente',
      email: 'ana@teste.com',
      tipo: UserTipo.cidadao,
      cidadeAmauc: 'Concordia',
      enderecoPrincipal: 'Rua Teste, 123',
      latitude: -27.2342,
      longitude: -52.0277,
    );
    final authRepository = FakeAuthRepository(user);
    final chamadoRepository = FakeChamadoRepository();
    const agenda = AgendaConfig(
      servicos: [
        AgendaServico(
          id: 7,
          nome: 'Instalacao eletrica',
          duracaoMinutos: 60,
          preco: 120,
        ),
      ],
      horarios: [
        AgendaHorario(diaSemana: 1, horario: '23:59'),
        AgendaHorario(diaSemana: 2, horario: '23:59'),
        AgendaHorario(diaSemana: 3, horario: '23:59'),
        AgendaHorario(diaSemana: 4, horario: '23:59'),
        AgendaHorario(diaSemana: 5, horario: '23:59'),
        AgendaHorario(diaSemana: 6, horario: '23:59'),
        AgendaHorario(diaSemana: 7, horario: '23:59'),
      ],
      diasSemana: [1, 2, 3, 4, 5, 6, 7],
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
          agendaProfissionalProvider(prestador.id).overrideWith(
            (ref) async => agenda,
          ),
        ],
        child: const MaterialApp(
          home: AgendarServicoScreen(prestador: prestador),
        ),
      ),
    );
    await tester.pumpAndSettle();
    final semantics = tester.ensureSemantics();

    expect(find.text('Instalacao eletrica'), findsOneWidget);
    expect(find.text('23:59'), findsOneWidget);
    expect(find.text('Rua Teste, 123'), findsOneWidget);
    expect(
      find.bySemanticsLabel(RegExp('Selecionar servico Instalacao eletrica')),
      findsOneWidget,
    );
    expect(
      find.bySemanticsLabel(RegExp('Selecionar data')),
      findsAtLeastNWidgets(1),
    );
    expect(find.bySemanticsLabel('Horario 23:59'), findsAtLeastNWidgets(1));
    expect(
      find.bySemanticsLabel(RegExp('Endereco do atendimento')),
      findsAtLeastNWidgets(1),
    );

    final addressField = find.byType(TextField).first;
    await tester.enterText(addressField, 'Rua Nova, 456');

    final confirmButton = find.text('Confirmar Agendamento');
    await tester.scrollUntilVisible(
      confirmButton,
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(confirmButton);
    await tester.pumpAndSettle();

    expect(chamadoRepository.createdChamado, isNotNull);
    expect(chamadoRepository.createdChamado!.profissionalId, prestador.id);
    expect(
        chamadoRepository.createdChamado!.enderecoAtendimento, 'Rua Nova, 456');
    expect(chamadoRepository.createdChamado!.atendimentoLatitude, isNull);
    expect(chamadoRepository.createdChamado!.atendimentoLongitude, isNull);
    expect(find.text('Agendamento Confirmado!'), findsOneWidget);
    semantics.dispose();
  });
}
