import 'package:ca_frontend/domain/entities/prestador.dart';
import 'package:ca_frontend/presentation/providers/providers.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../helpers/fakes.dart';

void main() {
  test('inicia a busca na cidade do usuario autenticado', () {
    final repository = FakePrestadorRepository(const []);
    final notifier = PrestadoresNotifier(
      repository,
      cidadeInicial: 'Seara',
    );

    expect(notifier.state.cidadeSelecionada, 'Seara');
  });

  test('usa Concordia quando a cidade do usuario esta ausente', () {
    final repository = FakePrestadorRepository(const []);
    final notifier = PrestadoresNotifier(repository, cidadeInicial: '  ');

    expect(notifier.state.cidadeSelecionada, 'Concórdia');
  });

  test('aplica e limpa filtros avancados ao buscar prestadores', () async {
    final repository = FakePrestadorRepository(const [
      Prestador(
        id: 9,
        nome: 'Carlos Eletricista',
        cidade: 'Concordia',
        categoria: 'Eletricista',
      ),
    ]);
    final notifier = PrestadoresNotifier(repository);
    final data = DateTime(2030, 6, 10);

    notifier.setFiltrosAvancados(
      precoMinimo: 80,
      precoMaximo: 250,
      notaMinima: 4.5,
      disponivelEm: data,
    );
    await Future<void>.delayed(Duration.zero);

    expect(repository.lastPrecoMinimo, 80);
    expect(repository.lastPrecoMaximo, 250);
    expect(repository.lastNotaMinima, 4.5);
    expect(repository.lastDisponivelEm, data);
    expect(notifier.state.precoMinimo, 80);
    expect(notifier.state.disponivelEm, data);

    notifier.setFiltrosAvancados(limpar: true);
    await Future<void>.delayed(Duration.zero);

    expect(repository.lastPrecoMinimo, isNull);
    expect(repository.lastPrecoMaximo, isNull);
    expect(repository.lastNotaMinima, isNull);
    expect(repository.lastDisponivelEm, isNull);
    expect(notifier.state.precoMinimo, isNull);
    expect(notifier.state.disponivelEm, isNull);
  });
}
