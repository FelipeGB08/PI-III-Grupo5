import 'package:ca_frontend/data/models/chamado_model.dart';
import 'package:ca_frontend/data/models/prestador_model.dart';
import 'package:ca_frontend/domain/entities/chamado.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('prestador interpreta localizacao publica como aproximada', () {
    final prestador = PrestadorModel.fromJson({
      'id': 9,
      'nome': 'Carlos',
      'cidade_amauc': 'Concordia',
      'latitude': -27.2342,
      'longitude': -52.0277,
      'distancia_km': 3.4,
      'localizacao_aproximada': true,
    });

    expect(prestador.latitude, -27.2342);
    expect(prestador.longitude, -52.0277);
    expect(prestador.distanciaKm, 3.4);
    expect(prestador.localizacaoAproximada, isTrue);
  });

  test('chamado serializa e interpreta coordenadas privadas do atendimento',
      () {
    const model = ChamadoModel(
      id: 1,
      descricao: 'Instalacao',
      status: ChamadoStatus.pendente,
      profissionalId: 9,
    );

    final body = model.toCreateJson(
      profissionalId: 9,
      descricao: 'Instalacao',
      servicoNome: 'Nome informado pelo cliente',
      preco: 1,
      atendimentoLatitude: -27.2342,
      atendimentoLongitude: -52.0277,
    );
    final chamado = ChamadoModel.fromJson({
      'id': 1,
      'descricao': 'Instalacao',
      'status': 'pendente',
      'prof_id': 9,
      ...body,
    });

    expect(body['atendimento_latitude'], -27.2342);
    expect(body['atendimento_longitude'], -52.0277);
    expect(body.containsKey('servico_nome'), isFalse);
    expect(body.containsKey('preco'), isFalse);
    expect(chamado.atendimentoLatitude, -27.2342);
    expect(chamado.atendimentoLongitude, -52.0277);
  });
}
