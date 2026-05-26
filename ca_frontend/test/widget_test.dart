import 'package:flutter_test/flutter_test.dart';
import 'package:ca_frontend/main.dart';

void main() {
  testWidgets('renderiza a tela inicial do Conecta Amauc', (WidgetTester tester) async {
    await tester.pumpWidget(const ConectaAmaucApp());
    expect(find.text('Conecta Amauc'), findsOneWidget);
    expect(find.text('Informações Pessoais'), findsOneWidget);
    expect(find.text('Serviços'), findsOneWidget);
  });
}
