import 'dart:async';

import 'package:ca_frontend/domain/entities/user.dart';
import 'package:ca_frontend/domain/repositories/auth_repository.dart';
import 'package:ca_frontend/presentation/providers/providers.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../helpers/fakes.dart';

const _user = User(
  id: 7,
  nome: 'Ana Cliente',
  email: 'ana@teste.com',
  tipo: UserTipo.cidadao,
  cidadeAmauc: 'Concordia',
);

class _AuthRepositoryControlado extends FakeAuthRepository {
  _AuthRepositoryControlado() : super(_user);

  Completer<AuthResult>? refreshCompleter;
  Object? refreshError;
  Object? logoutError;
  Object? deleteAccountError;
  int refreshCalls = 0;
  int logoutCalls = 0;

  @override
  Future<AuthResult> refreshSession() {
    refreshCalls++;
    if (refreshCompleter != null) return refreshCompleter!.future;
    if (refreshError != null) return Future<AuthResult>.error(refreshError!);
    return Future<AuthResult>.value(
      const AuthResult(token: 'access-renovado', user: _user),
    );
  }

  @override
  Future<void> logout() {
    logoutCalls++;
    if (logoutError != null) return Future<void>.error(logoutError!);
    return Future<void>.value();
  }

  @override
  Future<void> deleteAccount({required String confirmation}) {
    deleteAccountConfirmation = confirmation;
    if (deleteAccountError != null) {
      return Future<void>.error(deleteAccountError!);
    }
    return Future<void>.value();
  }
}

Future<void> _aguardarEventos() => Future<void>.delayed(Duration.zero);

void main() {
  test('só autentica no boot depois de validar o refresh token', () async {
    final repo = _AuthRepositoryControlado();
    repo.refreshCompleter = Completer<AuthResult>();
    final notifier = AuthNotifier(repo);
    addTearDown(notifier.dispose);

    expect(notifier.state.isInitializing, isTrue);
    expect(notifier.state.user, isNull);
    expect(repo.refreshCalls, 1);

    repo.refreshCompleter!.complete(
      const AuthResult(token: 'access-renovado', user: _user),
    );
    await _aguardarEventos();

    expect(notifier.state.isInitializing, isFalse);
    expect(notifier.state.user, _user);
  });

  test('sessão expirada no boot encerra estado local e socket', () async {
    final repo = _AuthRepositoryControlado()
      ..refreshError = StateError('Refresh revogado');
    var desconexoes = 0;
    final notifier = AuthNotifier(
      repo,
      onSessionEnded: () async => desconexoes++,
    );
    addTearDown(notifier.dispose);

    await _aguardarEventos();

    expect(repo.refreshCalls, 1);
    expect(repo.logoutCalls, 1);
    expect(desconexoes, 1);
    expect(notifier.state.user, isNull);
    expect(notifier.state.isInitializing, isFalse);
  });

  test('logout com erro remoto ainda limpa estado e desconecta socket',
      () async {
    final repo = _AuthRepositoryControlado()
      ..logoutError = StateError('Servidor indisponível');
    var desconexoes = 0;
    final notifier = AuthNotifier(
      repo,
      initialState: const AuthState(user: _user),
      onSessionEnded: () async => desconexoes++,
    );
    addTearDown(notifier.dispose);

    final saiu = await notifier.logout();

    expect(saiu, isFalse);
    expect(repo.logoutCalls, 1);
    expect(desconexoes, 1);
    expect(notifier.state.user, isNull);
    expect(notifier.state.error, contains('Servidor indisponível'));
  });

  test('exclusão de conta encerra estado e socket após a API confirmar',
      () async {
    final repo = _AuthRepositoryControlado();
    var desconexoes = 0;
    final notifier = AuthNotifier(
      repo,
      initialState: const AuthState(user: _user),
      onSessionEnded: () async => desconexoes++,
    );
    addTearDown(notifier.dispose);

    final excluida = await notifier.deleteAccount('EXCLUIR MINHA CONTA');

    expect(excluida, isTrue);
    expect(repo.deleteAccountConfirmation, 'EXCLUIR MINHA CONTA');
    expect(desconexoes, 1);
    expect(notifier.state.user, isNull);
  });

  test(
      'falha de storage depois da exclusao confirmada ainda encerra estado e socket',
      () async {
    final repo = _AuthRepositoryControlado()
      ..deleteAccountError = AccountDeletedWithLocalCleanupFailure(
        StateError('Cofre indisponivel'),
      );
    var desconexoes = 0;
    final notifier = AuthNotifier(
      repo,
      initialState: const AuthState(user: _user),
      onSessionEnded: () async => desconexoes++,
    );
    addTearDown(notifier.dispose);

    final excluida = await notifier.deleteAccount('EXCLUIR MINHA CONTA');

    expect(excluida, isTrue);
    expect(desconexoes, 1);
    expect(notifier.state.user, isNull);
    expect(notifier.state.isLoading, isFalse);
    expect(notifier.state.error, contains('Cofre indisponivel'));
  });
}
