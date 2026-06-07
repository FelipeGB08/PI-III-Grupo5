import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/network/api_error_formatter.dart';
import '../../core/network/dio_client.dart';
import '../../core/network/session_events.dart';
import '../../domain/entities/chamado.dart';
import '../../domain/entities/prestador.dart';
import '../../data/datasources/local/token_storage.dart';
import '../../data/datasources/remote/api_service.dart';
import '../../data/repositories/auth_repository_impl.dart';
import '../../data/repositories/avaliacao_repository_impl.dart';
import '../../data/repositories/chamado_repository_impl.dart';
import '../../data/repositories/prestador_repository_impl.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/repositories/avaliacao_repository.dart';
import '../../domain/repositories/chamado_repository.dart';
import '../../domain/repositories/prestador_repository.dart';

// ─── Infra ────────────────────────────────────────────────────────────────

final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('SharedPreferences não inicializado');
});

final tokenStorageProvider = Provider<TokenStorage>((ref) {
  return TokenStorage(ref.watch(sharedPreferencesProvider));
});

final dioClientProvider = Provider<DioClient>((ref) {
  final storage = ref.watch(tokenStorageProvider);
  return DioClient(
    tokenProvider: () => storage.getToken(),
    onUnauthorized: SessionEvents.notifyUnauthorized,
  );
});

final apiServiceProvider = Provider<ApiService>((ref) {
  return ApiService(ref.watch(dioClientProvider).instance);
});

// ─── Repositories ───────────────────────────────────────────────────────────

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepositoryImpl(
    ref.watch(apiServiceProvider),
    ref.watch(tokenStorageProvider),
  );
});

final prestadorRepositoryProvider = Provider<PrestadorRepository>((ref) {
  return PrestadorRepositoryImpl(ref.watch(apiServiceProvider));
});

final chamadoRepositoryProvider = Provider<ChamadoRepository>((ref) {
  return ChamadoRepositoryImpl(ref.watch(apiServiceProvider));
});

final avaliacaoRepositoryProvider = Provider<AvaliacaoRepository>((ref) {
  return AvaliacaoRepositoryImpl(ref.watch(apiServiceProvider));
});

// ─── Auth State ─────────────────────────────────────────────────────────────

class AuthState {
  const AuthState({this.user, this.isLoading = false, this.error});

  final User? user;
  final bool isLoading;
  final String? error;

  bool get isAuthenticated => user != null;

  AuthState copyWith({User? user, bool? isLoading, String? error}) {
    return AuthState(
      user: user,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._repo) : super(const AuthState()) {
    SessionEvents.addListener(_onUnauthorized);
    _loadSession();
  }

  final AuthRepository _repo;

  void _onUnauthorized() => logout();

  Future<void> _loadSession() async {
    final user = await _repo.getCurrentUser();
    if (user != null) {
      state = AuthState(user: user);
    }
  }

  Future<bool> login(String email, String senha) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final result = await _repo.login(email: email, senha: senha);
      state = AuthState(user: result.user);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: formatApiError(e));
      return false;
    }
  }

  Future<bool> register(RegisterParams params) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final result = await _repo.register(params);
      state = AuthState(user: result.user);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: formatApiError(e));
      return false;
    }
  }

  Future<void> logout() async {
    await _repo.logout();
    state = const AuthState();
  }

  @override
  void dispose() {
    SessionEvents.removeListener(_onUnauthorized);
    super.dispose();
  }
}

final authStateProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(authRepositoryProvider));
});

// ─── Prestadores ────────────────────────────────────────────────────────────

class PrestadoresState {
  const PrestadoresState({
    this.prestadores = const [],
    this.isLoading = false,
    this.erro,
    this.cidadeSelecionada = 'Concórdia',
    this.categoriaSelecionada,
    this.busca = '',
  });

  final List<Prestador> prestadores;
  final bool isLoading;
  final String? erro;
  final String cidadeSelecionada;
  final String? categoriaSelecionada;
  final String busca;

  PrestadoresState copyWith({
    List<Prestador>? prestadores,
    bool? isLoading,
    String? erro,
    String? cidadeSelecionada,
    String? categoriaSelecionada,
    String? busca,
    bool clearCategoria = false,
    bool clearErro = false,
  }) {
    return PrestadoresState(
      prestadores: prestadores ?? this.prestadores,
      isLoading: isLoading ?? this.isLoading,
      erro: clearErro ? null : (erro ?? this.erro),
      cidadeSelecionada: cidadeSelecionada ?? this.cidadeSelecionada,
      categoriaSelecionada:
          clearCategoria ? null : (categoriaSelecionada ?? this.categoriaSelecionada),
      busca: busca ?? this.busca,
    );
  }
}

class PrestadoresNotifier extends StateNotifier<PrestadoresState> {
  PrestadoresNotifier(this._repo) : super(const PrestadoresState());

  final PrestadorRepository _repo;

  Future<void> carregar({double? lat, double? lng}) async {
    state = state.copyWith(isLoading: true, clearErro: true);
    try {
      final result = await _repo.listar(
        cidade: state.cidadeSelecionada,
        categoria: state.categoriaSelecionada,
        lat: lat,
        lng: lng,
      );
      state = state.copyWith(
        prestadores: result,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        prestadores: const [],
        isLoading: false,
        erro: formatApiError(e),
      );
    }
  }

  void setCidade(String cidade) {
    state = state.copyWith(cidadeSelecionada: cidade);
    carregar();
  }

  void setCategoria(String? categoria) {
    state = state.copyWith(
      categoriaSelecionada: categoria,
      clearCategoria: categoria == null,
    );
    carregar();
  }

  void setBusca(String busca) {
    state = state.copyWith(busca: busca);
  }
}

final prestadoresProvider =
    StateNotifierProvider<PrestadoresNotifier, PrestadoresState>((ref) {
  return PrestadoresNotifier(ref.watch(prestadorRepositoryProvider));
});

// ─── Chamados ───────────────────────────────────────────────────────────────

final chamadosProvider =
    StateNotifierProvider<ChamadosNotifier, ChamadosState>((ref) {
  return ChamadosNotifier(
    ref.watch(chamadoRepositoryProvider),
    ref.watch(authStateProvider).user,
  );
});

class ChamadosState {
  const ChamadosState({
    this.chamados = const [],
    this.isLoading = false,
    this.pendingReview,
  });

  final List<Chamado> chamados;
  final bool isLoading;
  final Chamado? pendingReview;
}

class ChamadosNotifier extends StateNotifier<ChamadosState> {
  ChamadosNotifier(this._repo, this._user) : super(const ChamadosState());

  final ChamadoRepository _repo;
  final User? _user;

  Future<void> carregar() async {
    state = ChamadosState(isLoading: true, chamados: state.chamados);
    final list = await _repo.listarMeusChamados(
      isPrestador: _user?.tipo.isPrestador ?? false,
    );
    state = ChamadosState(chamados: list);
  }

  Future<void> aceitar(int id) => _atualizar(id, ChamadoStatus.emAndamento);
  Future<void> recusar(int id) => _atualizar(id, ChamadoStatus.recusado);
  Future<void> concluir(int id) => _atualizar(id, ChamadoStatus.concluido);

  Future<void> _atualizar(int id, ChamadoStatus status) async {
    final updated = await _repo.atualizarStatus(chamadoId: id, status: status);
    await carregar();
    if (status == ChamadoStatus.concluido && (_user?.tipo.isCliente ?? false)) {
      state = ChamadosState(
        chamados: state.chamados,
        pendingReview: updated,
      );
    }
  }

  void clearPendingReview() {
    state = ChamadosState(chamados: state.chamados);
  }
}
