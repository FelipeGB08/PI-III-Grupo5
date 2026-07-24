import 'package:ca_frontend/data/models/chamado_model.dart';
import 'package:ca_frontend/domain/entities/chamado.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('mapeia status e metadados da confirmacao de conclusao', () {
    final chamado = ChamadoModel.fromJson({
      'id': 44,
      'descricao': 'Servico finalizado',
      'status': 'aguardando_confirmacao_cliente',
      'prof_id': 9,
      'cidadao_id': 1,
      'fotos_conclusao': ['/uploads/evidencia.jpg'],
      'conclusao_solicitada_em': '2030-01-02T10:00:00.000Z',
      'conclusao_confirmada_em': null,
      'conclusao_confirmada_automaticamente': false,
    });

    expect(chamado.status, ChamadoStatus.aguardandoConfirmacaoCliente);
    expect(chamado.fotosConclusao, ['/uploads/evidencia.jpg']);
    expect(
      chamado.confirmacaoAutomaticaEm,
      DateTime.parse('2030-01-05T10:00:00.000Z'),
    );
    expect(chamado.conclusaoConfirmadaAutomaticamente, isFalse);
  });
}
