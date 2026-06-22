import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/network/api_error_formatter.dart';
import '../../core/network/dio_client.dart';
import '../../core/network/session_events.dart';
import '../../domain/entities/avaliacao.dart';
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
import '../../services/avaliacoes_service.dart';
import '../../services/profissionais_service.dart';
import '../../services/servicos_service.dart';

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

final profissionaisServiceProvider = Provider<ProfissionaisService>((ref) {
  return ProfissionaisService(ref.watch(dioClientProvider).instance);
});

final servicosServiceProvider = Provider<ServicosService>((ref) {
  return ServicosService(ref.watch(dioClientProvider).instance);
});

final avaliacoesServiceProvider = Provider<AvaliacoesService>((ref) {
  return AvaliacoesService(ref.watch(dioClientProvider).instance);
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

// ─── Providers Extras ───────────────────────────────────────────────────────

class AdminState {
  const AdminState({
    this.categorias = const [],
    this.relatorio,
    this.isLoading = false,
    this.error,
  });

  final List<Map<String, dynamic>> categorias;
  final Map<String, dynamic>? relatorio;
  final bool isLoading;
  final String? error;

  AdminState copyWith({
    List<Map<String, dynamic>>? categorias,
    Map<String, dynamic>? relatorio,
    bool? isLoading,
    String? error,
    bool clearError = false,
  }) {
    return AdminState(
      categorias: categorias ?? this.categorias,
      relatorio: relatorio ?? this.relatorio,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class AdminNotifier extends StateNotifier<AdminState> {
  AdminNotifier(this._api) : super(const AdminState());

  final ApiService _api;

  Future<void> carregar() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final results = await Future.wait([
        _api.listarCategorias(),
        _api.buscarRelatorioAdmin(),
      ]);
      state = state.copyWith(
        categorias: results[0] as List<Map<String, dynamic>>,
        relatorio: results[1] as Map<String, dynamic>,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: formatApiError(e));
    }
  }

  Future<bool> criarCategoria(String nome) async {
    try {
      await _api.criarCategoria(nome);
      await carregar();
      return true;
    } catch (e) {
      state = state.copyWith(error: formatApiError(e));
      return false;
    }
  }

  Future<bool> deletarCategoria(int id) async {
    try {
      await _api.deletarCategoria(id);
      await carregar();
      return true;
    } catch (e) {
      state = state.copyWith(error: formatApiError(e));
      return false;
    }
  }
}

final adminProvider = StateNotifierProvider<AdminNotifier, AdminState>((ref) {
  return AdminNotifier(ref.watch(apiServiceProvider));
});

class CurriculoState {
  const CurriculoState({
    this.data,
    this.isLoading = false,
    this.isSaving = false,
    this.error,
  });

  final Map<String, dynamic>? data;
  final bool isLoading;
  final bool isSaving;
  final String? error;

  CurriculoState copyWith({
    Map<String, dynamic>? data,
    bool? isLoading,
    bool? isSaving,
    String? error,
    bool clearError = false,
  }) {
    return CurriculoState(
      data: data ?? this.data,
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class CurriculoNotifier extends StateNotifier<CurriculoState> {
  CurriculoNotifier(this._api) : super(const CurriculoState());

  final ApiService _api;

  Future<void> carregar() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final data = await _api.buscarMeuPerfilProfissional();
      state = state.copyWith(data: data, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: formatApiError(e));
    }
  }

  Future<bool> salvar({
    required String biografia,
    required int anosExperiencia,
    String? curriculoTexto,
    String? portfolioUrl,
  }) async {
    state = state.copyWith(isSaving: true, clearError: true);
    try {
      final data = await _api.salvarCurriculoProfissional(
        biografia: biografia,
        anosExperiencia: anosExperiencia,
        curriculoTexto: curriculoTexto,
        portfolioUrl: portfolioUrl,
      );
      state = state.copyWith(data: data, isSaving: false);
      return true;
    } catch (e) {
      state = state.copyWith(isSaving: false, error: formatApiError(e));
      return false;
    }
  }
}

final curriculoProvider =
    StateNotifierProvider<CurriculoNotifier, CurriculoState>((ref) {
  return CurriculoNotifier(ref.watch(apiServiceProvider));
});

final avaliacoesProvider =
    FutureProvider.family<AvaliacoesResumo, int>((ref, prestadorId) {
  return ref
      .watch(avaliacaoRepositoryProvider)
      .listarDoProfissional(prestadorId);
});

class FavoritosNotifier extends StateNotifier<Set<int>> {
  FavoritosNotifier(this._prefs) : super(_load(_prefs));

  static const _key = 'favoritos_profissionais';

  final SharedPreferences _prefs;

  static Set<int> _load(SharedPreferences prefs) {
    return (prefs.getStringList(_key) ?? const <String>[])
        .map(int.tryParse)
        .whereType<int>()
        .toSet();
  }

  bool contains(int id) => state.contains(id);

  Future<void> toggle(int id) async {
    final next = {...state};
    if (!next.add(id)) {
      next.remove(id);
    }
    state = next;
    await _prefs.setStringList(
      _key,
      next.map((id) => id.toString()).toList(),
    );
  }
}

final favoritosProvider =
    StateNotifierProvider<FavoritosNotifier, Set<int>>((ref) {
  return FavoritosNotifier(ref.watch(sharedPreferencesProvider));
});

// ─── Auth State ─────────────────────────────────────────────────────────────

class AuthState {
  const AuthState({
    this.user,
    this.isLoading = false,
    this.isInitializing = false,
    this.error,
  });

  final User? user;
  final bool isLoading;
  final bool isInitializing;
  final String? error;

  bool get isAuthenticated => user != null;

  AuthState copyWith({
    User? user,
    bool? isLoading,
    bool? isInitializing,
    String? error,
  }) {
    return AuthState(
      user: user,
      isLoading: isLoading ?? this.isLoading,
      isInitializing: isInitializing ?? this.isInitializing,
      error: error,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._repo, {AuthState? initialState})
      : super(initialState ?? const AuthState(isInitializing: true)) {
    SessionEvents.addListener(_onUnauthorized);
    if (initialState == null) {
      _loadSession();
    }
  }

  final AuthRepository _repo;

  void _onUnauthorized() => logout();

  Future<void> _loadSession() async {
    final token = await _repo.getToken();
    final user = await _repo.getCurrentUser();

    if (token != null && token.isNotEmpty && user != null) {
      state = AuthState(user: user);
      return;
    }

    if (token != null || user != null) {
      await _repo.logout();
    }
    state = const AuthState();
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

  Future<bool> socialLogin({
    required String provider,
    required String token,
    required String cidadeAmauc,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final result = await _repo.socialLogin(
        provider: provider,
        token: token,
        cidadeAmauc: cidadeAmauc,
      );
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

  /// Envia magic link para login passwordless. Não altera sessão atual.
  Future<bool> requestMagicLink(String email) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _repo.requestMagicLink(email: email.trim());
      state = state.copyWith(isLoading: false, error: null);
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

  Future<User?> refreshProfile() async {
    try {
      final user = await _repo.refreshProfile();
      state = AuthState(user: user);
      return user;
    } catch (e) {
      state = state.copyWith(error: formatApiError(e));
      return null;
    }
  }

  Future<bool> updateProfile({
    String? nome,
    String? telefone,
    String? fotoUrl,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final user = await _repo.updateProfile(
        nome: nome,
        telefone: telefone,
        fotoUrl: fotoUrl,
      );
      state = AuthState(user: user);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: formatApiError(e));
      return false;
    }
  }

  Future<String?> uploadAvatar(String filePath) async {
    try {
      return await _repo.uploadAvatar(filePath);
    } catch (e) {
      state = state.copyWith(error: formatApiError(e));
      return null;
    }
  }

  @override
  void dispose() {
    SessionEvents.removeListener(_onUnauthorized);
    super.dispose();
  }
}

final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(authRepositoryProvider));
});

/// Provider auxiliar para restaurar sessão antes do primeiro frame.
AuthState? buildInitialAuthState(TokenStorage storage) {
  final token = storage.getToken();
  final user = storage.getUser();
  if (token != null && token.isNotEmpty && user != null) {
    return AuthState(user: user);
  }
  return null;
}

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
      categoriaSelecionada: clearCategoria
          ? null
          : (categoriaSelecionada ?? this.categoriaSelecionada),
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

      debugPrint("DEBUG: API retornou ${result.length} prestadores.");
      for (var p in result) {
        debugPrint("DEBUG: Carregado -> ${p.nome} (ID: ${p.id})");
      }

      state = state.copyWith(
        prestadores: result,
        isLoading: false,
      );
    } catch (e) {
      debugPrint("DEBUG ERRO API: $e");
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
