import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ca_frontend/data/datasources/remote/api_service.dart';
import 'package:ca_frontend/domain/entities/chamado.dart';
import 'package:ca_frontend/data/models/chamado_model.dart';
import 'providers.dart';

class ChamadosState {
  final List<ChamadoModel> chamados;
  final bool isLoading;
  final String? error;

  ChamadosState({
    this.chamados = const [],
    this.isLoading = false,
    this.error,
  });

  ChamadosState copyWith({
    List<ChamadoModel>? chamados,
    bool? isLoading,
    String? error,
  }) {
    return ChamadosState(
      chamados: chamados ?? this.chamados,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class ChamadosNotifier extends StateNotifier<ChamadosState> {
  final ApiService _apiService;

  ChamadosNotifier(this._apiService) : super(ChamadosState());

  Future<void> carregarChamados({String? status}) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final lista = await _apiService.listarChamadosPrestador(status: status);

      state = state.copyWith(
        chamados: lista,
        isLoading: false,
        error: null,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: ApiService.unwrap(e).toString(),
      );
    }
  }

  Future<void> atualizarStatus(
    int chamadoId,
    ChamadoStatus status,
  ) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      await _apiService.atualizarStatusChamado(
        chamadoId: chamadoId,
        status: status,
      );

      await carregarChamados();
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: ApiService.unwrap(e).toString(),
      );
    }
  }

  Future<void> cancelarSolicitacao(
    int chamadoId, {
    String? motivo,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      await _apiService.cancelarSolicitacao(
        chamadoId: chamadoId,
        motivo: motivo,
      );

      await carregarChamados();
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: ApiService.unwrap(e).toString(),
      );
    }
  }

  Future<void> solicitarRemarcacao(
    int chamadoId, {
    required DateTime novaDataHora,
    String? motivo,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      await _apiService.solicitarRemarcacao(
        chamadoId: chamadoId,
        novaDataHora: novaDataHora,
        motivo: motivo,
      );

      await carregarChamados();
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: ApiService.unwrap(e).toString(),
      );
    }
  }

  Future<void> aceitarRemarcacao(int chamadoId) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      await _apiService.aceitarRemarcacao(chamadoId: chamadoId);

      await carregarChamados();
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: ApiService.unwrap(e).toString(),
      );
    }
  }

  Future<void> recusarRemarcacao(int chamadoId) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      await _apiService.recusarRemarcacao(chamadoId: chamadoId);

      await carregarChamados();
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: ApiService.unwrap(e).toString(),
      );
    }
  }
}

final chamadosProvider =
    StateNotifierProvider<ChamadosNotifier, ChamadosState>((ref) {
  return ChamadosNotifier(ref.watch(apiServiceProvider));
});
