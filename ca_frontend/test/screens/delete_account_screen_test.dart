import 'dart:convert';
import 'dart:typed_data';

import 'package:ca_frontend/data/datasources/remote/api_service.dart';
import 'package:ca_frontend/domain/entities/user.dart';
import 'package:ca_frontend/presentation/providers/providers.dart';
import 'package:ca_frontend/presentation/screens/conta/minha_conta_screen.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../helpers/fakes.dart';

class _PreferencesAdapter implements HttpClientAdapter {
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return ResponseBody.fromString(
      jsonEncode({
        'preferencias': {'novos_horarios_favoritos': true},
      }),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  testWidgets('exige confirmacao digitada antes de excluir a conta',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final user = User(
      id: 7,
      nome: 'Ana Cliente',
      email: 'ana@teste.com',
      tipo: UserTipo.cidadao,
      cidadeAmauc: 'Concordia',
    );
    final authRepository = FakeAuthRepository(user);
    final apiService = ApiService(
      Dio()..httpClientAdapter = _PreferencesAdapter(),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          apiServiceProvider.overrideWithValue(apiService),
          authStateProvider.overrideWith(
            (ref) => AuthNotifier(
              authRepository,
              initialState: AuthState(user: user),
            ),
          ),
        ],
        child: const MaterialApp(
          home: Scaffold(body: MinhaContaScreen()),
        ),
      ),
    );
    await tester.pumpAndSettle();
    final semantics = tester.ensureSemantics();

    final highContrast = find.bySemanticsLabel(RegExp('Alto contraste'));
    await tester.ensureVisible(highContrast);
    expect(highContrast, findsOneWidget);
    await tester.tap(find.byType(Switch).last);
    await tester.pumpAndSettle();
    expect(prefs.getBool('app_high_contrast'), isTrue);

    await tester.scrollUntilVisible(
      find.text('Excluir conta'),
      400,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.tap(find.text('Excluir conta').first);
    await tester.pumpAndSettle();

    expect(find.text('Excluir conta permanentemente?'), findsOneWidget);
    await tester.tap(find.text('Continuar'));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byType(TextField).last,
      'EXCLUIR MINHA CONTA',
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Excluir conta').last);
    await tester.pumpAndSettle();

    expect(authRepository.deleteAccountConfirmation, 'EXCLUIR MINHA CONTA');
    semantics.dispose();
  });
}
