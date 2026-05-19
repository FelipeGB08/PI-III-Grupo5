import 'package:flutter_test/flutter_test.dart';
import 'package:ca_frontend/main.dart';

void main() {
  testWidgets('renderiza a tela inicial do aplicativo Casa Azul', (WidgetTester tester) async {
    await tester.pumpWidget(const CasaAzulApp());

    expect(find.text('Casa Azul'), findsOneWidget);
    expect(find.text('Informações Pessoais'), findsOneWidget);
    expect(find.text('Serviços'), findsOneWidget);
  });
}
