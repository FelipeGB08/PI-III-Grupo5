import 'package:ca_frontend/core/theme/app_color_palette.dart';
import 'package:ca_frontend/core/theme/app_theme.dart';
import 'package:ca_frontend/presentation/providers/providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('persiste a preferencia de alto contraste entre inicializacoes',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final container = ProviderContainer(
      overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
    );
    addTearDown(container.dispose);

    expect(container.read(appHighContrastProvider), isFalse);
    await container.read(appHighContrastProvider.notifier).setEnabled(true);

    expect(container.read(appHighContrastProvider), isTrue);
    expect(prefs.getBool('app_high_contrast'), isTrue);

    final restarted = ProviderContainer(
      overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
    );
    addTearDown(restarted.dispose);
    expect(restarted.read(appHighContrastProvider), isTrue);
  });

  testWidgets('tema de alto contraste usa paleta global legivel',
      (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(highContrast: true),
        home: Builder(
          builder: (context) {
            final palette = Theme.of(context).extension<AppColorPalette>();
            return Text(
              '${palette!.background.toARGB32()}:${palette.textPrimary.toARGB32()}',
            );
          },
        ),
      ),
    );

    expect(
      find.text('${Colors.white.toARGB32()}:${Colors.black.toARGB32()}'),
      findsOneWidget,
    );
  });
}
