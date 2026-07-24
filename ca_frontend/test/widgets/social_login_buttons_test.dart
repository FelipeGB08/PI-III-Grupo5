import 'package:ca_frontend/presentation/widgets/auth/social_login_buttons.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('anuncia e aciona os provedores de login social', (tester) async {
    var githubTocado = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SocialLoginButtons(
            onGoogleTap: () {},
            onAppleTap: () {},
            onGitHubTap: () => githubTocado = true,
          ),
        ),
      ),
    );
    final semantics = tester.ensureSemantics();

    expect(find.bySemanticsLabel('Continuar com Google'), findsOneWidget);
    expect(find.bySemanticsLabel('Continuar com Apple'), findsOneWidget);
    expect(find.bySemanticsLabel('Continuar com GitHub'), findsOneWidget);

    await tester.tap(find.bySemanticsLabel('Continuar com GitHub'));
    expect(githubTocado, isTrue);
    semantics.dispose();
  });
}
