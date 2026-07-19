import 'package:ca_frontend/domain/entities/chamado.dart';
import 'package:ca_frontend/domain/entities/user.dart';
import 'package:ca_frontend/presentation/providers/providers.dart';
import 'package:ca_frontend/presentation/screens/agendamentos/agendamento_detalhes_screen.dart';
import 'package:ca_frontend/presentation/widgets/avaliacao_bottom_sheet.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../helpers/fakes.dart';

void main() {
  testWidgets('cidadao avalia servico concluido usando repositorio falso',
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
      id: 42,
      descricao: 'Servico: Instalacao eletrica',
      status: ChamadoStatus.concluido,
      profissionalId: 9,
      profissionalNome: 'Carlos Eletricista',
      cidadaoId: 1,
      servicoNome: 'Instalacao eletrica',
      preco: 120,
    );
    final authRepository = FakeAuthRepository(user);
    final chamadoRepository = FakeChamadoRepository([chamado]);
    final avaliacaoRepository = FakeAvaliacaoRepository();

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
          avaliacaoRepositoryProvider.overrideWithValue(avaliacaoRepository),
        ],
        child: const MaterialApp(
          home: AgendamentoDetalhesScreen(chamado: chamado),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Agendamento Concluido'), findsOneWidget);
    expect(find.text('Carlos Eletricista'), findsOneWidget);

    final evaluateButton = find.text('Avaliar Servico');
    await tester.scrollUntilVisible(evaluateButton, 300);
    await tester.tap(evaluateButton);
    await tester.pumpAndSettle();

    expect(find.byType(AvaliacaoBottomSheet), findsOneWidget);
    final sheet = find.byType(AvaliacaoBottomSheet);
    final stars = find.descendant(
      of: sheet,
      matching: find.byIcon(Icons.star_rounded),
    );
    expect(stars, findsNWidgets(5));
    await tester.tap(stars.at(3));

    final commentField = find.descendant(
      of: sheet,
      matching: find.byType(TextField),
    );
    await tester.enterText(commentField, 'Atendimento muito bom');
    tester.testTextInput.hide();
    await tester.pumpAndSettle();

    final submitButton = find.descendant(
      of: sheet,
      matching: find.byType(ElevatedButton),
    );
    await tester.ensureVisible(submitButton);
    await tester.tap(submitButton);
    await tester.pumpAndSettle();

    expect(avaliacaoRepository.solicitacaoId, chamado.id);
    expect(avaliacaoRepository.profissionalId, chamado.profissionalId);
    expect(avaliacaoRepository.nota, 4);
    expect(avaliacaoRepository.comentario, 'Atendimento muito bom');
    expect(find.byType(AvaliacaoBottomSheet), findsNothing);
  });
}
