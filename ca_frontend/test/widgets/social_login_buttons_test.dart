import 'package:ca_frontend/presentation/widgets/auth/social_login_buttons.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('anuncia e aciona somente o login Google', (tester) async {
    var googleTocado = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SocialLoginButtons(
            onGoogleTap: () => googleTocado = true,
          ),
        ),
      ),
    );
    final semantics = tester.ensureSemantics();

    expect(find.bySemanticsLabel('Continuar com Google'), findsOneWidget);
    expect(find.textContaining('Apple'), findsNothing);
    expect(find.textContaining('GitHub'), findsNothing);

    await tester.tap(find.bySemanticsLabel('Continuar com Google'));
    expect(googleTocado, isTrue);
    semantics.dispose();
  });
}
