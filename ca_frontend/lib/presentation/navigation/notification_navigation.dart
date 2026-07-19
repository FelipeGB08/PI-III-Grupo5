import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_error_formatter.dart';
import '../providers/providers.dart';
import '../screens/agendamentos/agendamento_detalhes_screen.dart';
import '../screens/chat/chat_screen.dart';

class NotificationNavigation {
  NotificationNavigation._();

  static Future<void> openFromPayload(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> payload, {
    String? tipo,
  }) async {
    final solicitacaoId = _asInt(
      payload['solicitacao_id'] ??
          payload['servico_id'] ??
          payload['chamado_id'],
    );

    if (solicitacaoId == null || solicitacaoId <= 0) {
      _show(context, 'Este aviso nao possui um chamado vinculado.');
      return;
    }

    try {
      final chamado =
          await ref.read(chamadoRepositoryProvider).buscarPorId(solicitacaoId);
      if (!context.mounted) return;

      final destino = payload['destino']?.toString().toLowerCase() ?? '';
      final tipoNormalizado =
          (tipo ?? payload['tipo']?.toString() ?? '').toLowerCase();

      final abrirChat = destino == 'chat' ||
          tipoNormalizado.contains('chat') ||
          tipoNormalizado.contains('mensagem');

      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => abrirChat
              ? ChatScreen(chamado: chamado)
              : AgendamentoDetalhesScreen(chamado: chamado),
        ),
      );
    } catch (e) {
      if (!context.mounted) return;
      _show(context, formatApiError(e));
    }
  }

  static int? _asInt(dynamic value) {
    if (value is int) return value;
    return int.tryParse(value?.toString() ?? '');
  }

  static void _show(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }
}
