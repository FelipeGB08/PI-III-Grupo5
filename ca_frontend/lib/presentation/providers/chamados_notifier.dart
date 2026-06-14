import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ca_frontend/data/datasources/remote/api_service.dart';
import 'package:ca_frontend/domain/entities/chamado.dart';
import 'package:ca_frontend/data/models/chamado_model.dart'; // Import corrigido
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
      error: error ?? this.error,
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
      state = state.copyWith(chamados: lista, isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false, 
        error: ApiService.unwrap(e).toString(),
      );
    }
  }

  Future<void> atualizarStatus(int chamadoId, ChamadoStatus status, {double? preco}) async {
    state = state.copyWith(isLoading: true);
    try {
      await _apiService.atualizarStatusChamado(
        chamadoId: chamadoId,
        status: status,
        preco: preco,
      );
      await carregarChamados(); 
    } catch (e) {
      state = state.copyWith(
        isLoading: false, 
        error: ApiService.unwrap(e).toString(),
      );
    }
  }
}

final chamadosProvider = StateNotifierProvider<ChamadosNotifier, ChamadosState>((ref) {
  return ChamadosNotifier(ref.watch(apiServiceProvider));
});