import 'package:ca_frontend/domain/entities/chamado.dart';
import 'package:ca_frontend/domain/entities/user.dart';
import 'package:ca_frontend/presentation/providers/providers.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../helpers/fakes.dart';

void main() {
  test('restaura a lista quando uma remarcacao e recusada pelo servidor',
      () async {
    final repository = FakeChamadoRepository(
      const [
        Chamado(
          id: 42,
          descricao: 'Suporte de TI',
          status: ChamadoStatus.emAndamento,
          profissionalId: 9,
          cidadaoId: 1,
        ),
      ],
    );
    final notifier = ChamadosNotifier(
      repository,
      const User(
        id: 9,
        nome: 'Profissional',
        email: 'pro@teste.com',
        tipo: UserTipo.profissional,
      ),
    );
    addTearDown(notifier.dispose);

    await notifier.carregar();
    repository.remarcacaoError = Exception('Horario indisponivel');

    await expectLater(
      notifier.solicitarRemarcacao(
        42,
        novaDataHora: DateTime(2026, 8, 11, 9),
      ),
      throwsA(isA<Exception>()),
    );

    expect(notifier.state.isLoading, isFalse);
    expect(notifier.state.chamados.single.id, 42);
    expect(notifier.state.chamados.single.status, ChamadoStatus.emAndamento);
  });
}
