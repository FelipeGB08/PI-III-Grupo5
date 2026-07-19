import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/network/api_error_formatter.dart';
import '../../core/network/dio_client.dart';
import '../../core/network/session_events.dart';
import '../../domain/entities/agenda_config.dart';
import '../../domain/entities/avaliacao.dart';
import '../../domain/entities/chamado.dart';
import '../../domain/entities/chat_conversa.dart';
import '../../domain/entities/financeiro.dart';
import '../../domain/entities/notificacao.dart';
import '../../domain/entities/prestador.dart';
import '../../data/datasources/local/token_storage.dart';
import '../../data/datasources/remote/api_service.dart';
import '../../data/repositories/auth_repository_impl.dart';
import '../../data/repositories/avaliacao_repository_impl.dart';
import '../../data/repositories/chamado_repository_impl.dart';
import '../../data/repositories/prestador_repository_impl.dart';
import '../../data/services/chat_socket_service.dart';
import '../../data/services/map_route_service.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/repositories/avaliacao_repository.dart';
import '../../domain/repositories/chamado_repository.dart';
import '../../domain/repositories/prestador_repository.dart';

// ─── Infra ────────────────────────────────────────────────────────────────

final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('SharedPreferences não inicializado');
});

class AppThemeModeNotifier extends StateNotifier<ThemeMode> {
  AppThemeModeNotifier(this._prefs)
      : super(_parse(_prefs.getString(_themeModeKey)));

  static const _themeModeKey = 'app_theme_mode';

  final SharedPreferences _prefs;

  static ThemeMode _parse(String? value) {
    return switch (value) {
      'light' => ThemeMode.light,
      'system' => ThemeMode.system,
      _ => ThemeMode.dark,
    };
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    state = mode;
    final value = switch (mode) {
      ThemeMode.light => 'light',
      ThemeMode.system => 'system',
      ThemeMode.dark => 'dark',
    };
    await _prefs.setString(_themeModeKey, value);
  }

  Future<void> setDarkMode(bool enabled) {
    return setThemeMode(enabled ? ThemeMode.dark : ThemeMode.light);
  }
}

final appThemeModeProvider =
    StateNotifierProvider<AppThemeModeNotifier, ThemeMode>((ref) {
  return AppThemeModeNotifier(ref.watch(sharedPreferencesProvider));
});

final tokenStorageProvider = Provider<TokenStorage>((ref) {
  return TokenStorage(ref.watch(sharedPreferencesProvider));
});

final dioClientProvider = Provider<DioClient>((ref) {
  final storage = ref.watch(tokenStorageProvider);
  return DioClient(
    tokenProvider: () => storage.getToken(),
    refreshTokenProvider: () => storage.getRefreshToken(),
    tokenSaver: storage.saveToken,
    sessionClearer: storage.clear,
    onUnauthorized: SessionEvents.notifyUnauthorized,
  );
});

final apiServiceProvider = Provider<ApiService>((ref) {
  return ApiService(ref.watch(dioClientProvider).instance);
});

final chatSocketServiceProvider = Provider<ChatSocketService>((ref) {
  final service = ChatSocketService(ref.watch(tokenStorageProvider));
  ref.onDispose(service.dispose);
  return service;
});

final mapRouteServiceProvider = Provider<MapRouteService>((ref) {
  return MapRouteService();
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

  Future<bool> atualizarCategoria(int id, String nome) async {
    try {
      await _api.atualizarCategoria(id, nome);
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
    List<String> portfolioFotos = const [],
    List<String> certificacoes = const [],
    List<String> cidadesAtendidas = const [],
    bool? atendeRural,
    bool? atendeEmergencia,
    bool? possuiVeiculo,
    double? taxaDeslocamento,
  }) async {
    state = state.copyWith(isSaving: true, clearError: true);
    try {
      final data = await _api.salvarCurriculoProfissional(
        biografia: biografia,
        anosExperiencia: anosExperiencia,
        curriculoTexto: curriculoTexto,
        portfolioUrl: portfolioUrl,
        portfolioFotos: portfolioFotos,
        certificacoes: certificacoes,
        cidadesAtendidas: cidadesAtendidas,
        atendeRural: atendeRural,
        atendeEmergencia: atendeEmergencia,
        possuiVeiculo: possuiVeiculo,
        taxaDeslocamento: taxaDeslocamento,
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

final agendaProfissionalProvider =
    FutureProvider.family<AgendaConfig, int>((ref, profissionalId) {
  return ref.watch(apiServiceProvider).buscarAgendaProfissional(profissionalId);
});

class MinhaAgendaState {
  const MinhaAgendaState({
    this.data,
    this.isLoading = false,
    this.isSaving = false,
    this.error,
  });

  final AgendaConfig? data;
  final bool isLoading;
  final bool isSaving;
  final String? error;

  MinhaAgendaState copyWith({
    AgendaConfig? data,
    bool? isLoading,
    bool? isSaving,
    String? error,
    bool clearError = false,
  }) {
    return MinhaAgendaState(
      data: data ?? this.data,
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class MinhaAgendaNotifier extends StateNotifier<MinhaAgendaState> {
  MinhaAgendaNotifier(this._api) : super(const MinhaAgendaState());

  final ApiService _api;

  Future<void> carregar() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final data = await _api.buscarMinhaAgenda();
      state = state.copyWith(data: data, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: formatApiError(e));
    }
  }

  Future<bool> salvar(AgendaConfig config) async {
    state = state.copyWith(isSaving: true, clearError: true);
    try {
      final data = await _api.salvarMinhaAgenda(config);
      state = state.copyWith(data: data, isSaving: false);
      return true;
    } catch (e) {
      state = state.copyWith(isSaving: false, error: formatApiError(e));
      return false;
    }
  }
}

final minhaAgendaProvider =
    StateNotifierProvider<MinhaAgendaNotifier, MinhaAgendaState>((ref) {
  return MinhaAgendaNotifier(ref.watch(apiServiceProvider));
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

class NotificacoesState {
  const NotificacoesState({
    this.items = const [],
    this.naoLidas = 0,
    this.isLoading = false,
    this.error,
  });

  final List<Notificacao> items;
  final int naoLidas;
  final bool isLoading;
  final String? error;

  NotificacoesState copyWith({
    List<Notificacao>? items,
    int? naoLidas,
    bool? isLoading,
    String? error,
    bool clearError = false,
  }) {
    return NotificacoesState(
      items: items ?? this.items,
      naoLidas: naoLidas ?? this.naoLidas,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class NotificacoesNotifier extends StateNotifier<NotificacoesState> {
  NotificacoesNotifier(this._api) : super(const NotificacoesState());

  final ApiService _api;

  Future<void> carregar() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final response = await _api.listarNotificacoes();
      state = state.copyWith(
        items: response.notificacoes,
        naoLidas: response.naoLidas,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: formatApiError(e));
    }
  }

  Future<void> marcarLida(int id) async {
    try {
      await _api.marcarNotificacaoLida(id);
      await carregar();
    } catch (e) {
      state = state.copyWith(error: formatApiError(e));
    }
  }

  Future<void> marcarTodasLidas() async {
    try {
      await _api.marcarTodasNotificacoesLidas();
      await carregar();
    } catch (e) {
      state = state.copyWith(error: formatApiError(e));
    }
  }
}

final notificacoesProvider =
    StateNotifierProvider<NotificacoesNotifier, NotificacoesState>((ref) {
  return NotificacoesNotifier(ref.watch(apiServiceProvider));
});

class FinanceiroState {
  const FinanceiroState({
    this.data,
    this.statusFiltro,
    this.isLoading = false,
    this.error,
  });

  final FinanceiroData? data;
  final ChamadoStatus? statusFiltro;
  final bool isLoading;
  final String? error;

  FinanceiroState copyWith({
    FinanceiroData? data,
    ChamadoStatus? statusFiltro,
    bool? isLoading,
    String? error,
    bool clearError = false,
    bool clearStatus = false,
  }) {
    return FinanceiroState(
      data: data ?? this.data,
      statusFiltro: clearStatus ? null : (statusFiltro ?? this.statusFiltro),
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class FinanceiroNotifier extends StateNotifier<FinanceiroState> {
  FinanceiroNotifier(this._api) : super(const FinanceiroState());

  final ApiService _api;

  Future<void> carregar() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final data = await _api.buscarFinanceiro(
        status: state.statusFiltro?.apiValue,
      );
      state = state.copyWith(data: data, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: formatApiError(e));
    }
  }

  Future<void> filtrar(ChamadoStatus? status) async {
    state = state.copyWith(
      statusFiltro: status,
      clearStatus: status == null,
    );
    await carregar();
  }
}

final financeiroProvider =
    StateNotifierProvider<FinanceiroNotifier, FinanceiroState>((ref) {
  return FinanceiroNotifier(ref.watch(apiServiceProvider));
});

class ConversasState {
  const ConversasState({
    this.items = const [],
    this.isLoading = false,
    this.error,
  });

  final List<ChatConversa> items;
  final bool isLoading;
  final String? error;

  int get naoLidas => items.fold(0, (total, item) => total + item.naoLidas);

  ConversasState copyWith({
    List<ChatConversa>? items,
    bool? isLoading,
    String? error,
    bool clearError = false,
  }) {
    return ConversasState(
      items: items ?? this.items,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class ConversasNotifier extends StateNotifier<ConversasState> {
  ConversasNotifier(this._api) : super(const ConversasState());

  final ApiService _api;

  Future<void> carregar() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final conversas = await _api.listarConversasChat();
      state = state.copyWith(items: conversas, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: formatApiError(e));
    }
  }
}

final conversasProvider =
    StateNotifierProvider<ConversasNotifier, ConversasState>((ref) {
  return ConversasNotifier(ref.watch(apiServiceProvider));
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

    if (token != null && token.isNotEmpty) {
      try {
        final result = await _repo.refreshSession();
        state = AuthState(user: result.user);
        return;
      } catch (_) {
        await _repo.logout();
      }
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
  Future<String?> requestMagicLink(String email) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final devToken = await _repo.requestMagicLink(email: email.trim());
      state = state.copyWith(isLoading: false, error: null);
      return devToken ?? '';
    } catch (e) {
      state = state.copyWith(isLoading: false, error: formatApiError(e));
      return null;
    }
  }

  Future<bool> verifyMagicLink(String token) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final result = await _repo.verifyMagicLink(token: token);
      state = AuthState(user: result.user);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: formatApiError(e));
      return false;
    }
  }

  Future<String?> requestPasswordReset(String email) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final devToken = await _repo.requestPasswordReset(email: email.trim());
      state = state.copyWith(isLoading: false, error: null);
      return devToken ?? '';
    } catch (e) {
      state = state.copyWith(isLoading: false, error: formatApiError(e));
      return null;
    }
  }

  Future<bool> confirmPasswordReset({
    required String token,
    required String senha,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _repo.confirmPasswordReset(token: token, senha: senha);
      state = state.copyWith(isLoading: false, error: null);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: formatApiError(e));
      return false;
    }
  }

  Future<bool> deleteAccount(String confirmation) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _repo.deleteAccount(confirmation: confirmation);
      state = const AuthState();
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
    String? enderecoPrincipal,
    double? latitude,
    double? longitude,
    String? fotoUrl,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final user = await _repo.updateProfile(
        nome: nome,
        telefone: telefone,
        enderecoPrincipal: enderecoPrincipal,
        latitude: latitude,
        longitude: longitude,
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

  Future<String?> uploadAvatarBytes({
    required List<int> bytes,
    required String filename,
  }) async {
    try {
      return await _repo.uploadAvatarBytes(bytes: bytes, filename: filename);
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
    this.lat,
    this.lng,
    this.raioKm = 30,
  });

  final List<Prestador> prestadores;
  final bool isLoading;
  final String? erro;
  final String cidadeSelecionada;
  final String? categoriaSelecionada;
  final String busca;
  final double? lat;
  final double? lng;
  final double raioKm;

  PrestadoresState copyWith({
    List<Prestador>? prestadores,
    bool? isLoading,
    String? erro,
    String? cidadeSelecionada,
    String? categoriaSelecionada,
    String? busca,
    double? lat,
    double? lng,
    double? raioKm,
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
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
      raioKm: raioKm ?? this.raioKm,
    );
  }
}

class PrestadoresNotifier extends StateNotifier<PrestadoresState> {
  PrestadoresNotifier(this._repo) : super(const PrestadoresState());

  final PrestadorRepository _repo;

  Future<void> carregar({double? lat, double? lng, String? cidade}) async {
    final latBusca = lat ?? state.lat;
    final lngBusca = lng ?? state.lng;
    final cidadeBusca = cidade ?? state.cidadeSelecionada;
    state = state.copyWith(
      isLoading: true,
      clearErro: true,
      cidadeSelecionada: cidadeBusca,
      lat: latBusca,
      lng: lngBusca,
    );
    try {
      final result = await _repo.listar(
        cidade: cidadeBusca,
        categoria: state.categoriaSelecionada,
        lat: latBusca,
        lng: lngBusca,
        raioKm: state.raioKm,
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

  void setRaio(double raioKm) {
    state = state.copyWith(raioKm: raioKm);
    carregar();
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
    this.isLoadingMore = false,
    this.page = 0,
    this.total = 0,
    this.hasMore = false,
    this.pendingReview,
  });

  final List<Chamado> chamados;
  final bool isLoading;
  final bool isLoadingMore;
  final int page;
  final int total;
  final bool hasMore;
  final Chamado? pendingReview;
}

class ChamadosNotifier extends StateNotifier<ChamadosState> {
  ChamadosNotifier(this._repo, this._user) : super(const ChamadosState());

  final ChamadoRepository _repo;
  final User? _user;
  static const _pageSize = 20;

  Future<void> carregar() async {
    state = ChamadosState(isLoading: true, chamados: state.chamados);
    final pagina = await _repo.listarMeusChamados(
      isPrestador: _user?.tipo.isPrestador ?? false,
      page: 1,
      pageSize: _pageSize,
    );
    state = ChamadosState(
      chamados: pagina.items,
      page: pagina.page,
      total: pagina.total,
      hasMore: pagina.hasMore,
    );
  }

  Future<void> carregarMais() async {
    if (state.isLoading || state.isLoadingMore || !state.hasMore) return;

    state = ChamadosState(
      chamados: state.chamados,
      isLoadingMore: true,
      page: state.page,
      total: state.total,
      hasMore: state.hasMore,
    );
    final pagina = await _repo.listarMeusChamados(
      isPrestador: _user?.tipo.isPrestador ?? false,
      page: state.page + 1,
      pageSize: _pageSize,
    );
    final idsExistentes = state.chamados.map((item) => item.id).toSet();
    final novos =
        pagina.items.where((item) => !idsExistentes.contains(item.id)).toList();
    state = ChamadosState(
      chamados: [...state.chamados, ...novos],
      page: pagina.page,
      total: pagina.total,
      hasMore: pagina.hasMore,
    );
  }

  Future<void> cancelarSolicitacao(int chamadoId, {String? motivo}) async {
    state = ChamadosState(
      isLoading: true,
      chamados: state.chamados,
      page: state.page,
      total: state.total,
      hasMore: state.hasMore,
    );

    await _repo.cancelarSolicitacao(chamadoId: chamadoId, motivo: motivo);

    await carregar();
  }

  Future<void> solicitarRemarcacao(
    int chamadoId, {
    required DateTime novaDataHora,
    String? motivo,
  }) async {
    state = ChamadosState(
      isLoading: true,
      chamados: state.chamados,
      page: state.page,
      total: state.total,
      hasMore: state.hasMore,
    );

    await _repo.solicitarRemarcacao(
      chamadoId: chamadoId,
      novaDataHora: novaDataHora,
      motivo: motivo,
    );

    await carregar();
  }

  Future<void> aceitarRemarcacao(int chamadoId) async {
    state = ChamadosState(
      isLoading: true,
      chamados: state.chamados,
      page: state.page,
      total: state.total,
      hasMore: state.hasMore,
    );
    await _repo.aceitarRemarcacao(chamadoId: chamadoId);
    await carregar();
  }

  Future<void> recusarRemarcacao(int chamadoId) async {
    state = ChamadosState(
      isLoading: true,
      chamados: state.chamados,
      page: state.page,
      total: state.total,
      hasMore: state.hasMore,
    );
    await _repo.recusarRemarcacao(chamadoId: chamadoId);
    await carregar();
  }

  Future<void> aceitar(int id) => _atualizar(id, ChamadoStatus.emAndamento);
  Future<void> recusar(int id) => _atualizar(id, ChamadoStatus.recusado);
  Future<void> concluir(int id) => _atualizar(id, ChamadoStatus.concluido);
  Future<void> proporValor(int id, double preco, {String? motivo}) async {
    await _repo.proporValor(chamadoId: id, preco: preco, motivo: motivo);
    await carregar();
  }

  Future<void> aceitarPropostaValor(int id) async {
    await _repo.aceitarPropostaValor(chamadoId: id);
    await carregar();
  }

  Future<void> recusarPropostaValor(int id) async {
    await _repo.recusarPropostaValor(chamadoId: id);
    await carregar();
  }

  Future<void> _atualizar(
    int id,
    ChamadoStatus status,
  ) async {
    final updated = await _repo.atualizarStatus(
      chamadoId: id,
      status: status,
    );
    await carregar();
    if (status == ChamadoStatus.concluido && (_user?.tipo.isCliente ?? false)) {
      state = ChamadosState(
        chamados: state.chamados,
        page: state.page,
        total: state.total,
        hasMore: state.hasMore,
        pendingReview: updated,
      );
    }
  }

  void clearPendingReview() {
    state = ChamadosState(
      chamados: state.chamados,
      page: state.page,
      total: state.total,
      hasMore: state.hasMore,
    );
  }
}
