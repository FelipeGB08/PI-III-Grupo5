import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/config/api_config.dart';
import '../../../core/theme/adaptive_colors.dart';
import '../../../core/theme/app_colors.dart';
import '../../../domain/entities/chamado.dart';
import '../../../domain/entities/chat_conversa.dart';
import '../../../domain/entities/user.dart';
import '../../providers/providers.dart';
import '../../widgets/profile_avatar.dart';
import 'chat_screen.dart';

class ConversasScreen extends ConsumerStatefulWidget {
  const ConversasScreen({super.key});

  @override
  ConsumerState<ConversasScreen> createState() => _ConversasScreenState();
}

class _ConversasScreenState extends ConsumerState<ConversasScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(conversasProvider.notifier).carregar();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(conversasProvider);

    return Scaffold(
      backgroundColor: context.appBackground,
      appBar: AppBar(
        title: const Text('Conversas'),
        backgroundColor: context.appBackground,
        actions: [
          IconButton(
            tooltip: 'Atualizar',
            onPressed: () => ref.read(conversasProvider.notifier).carregar(),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(conversasProvider.notifier).carregar(),
        child: _buildBody(state),
      ),
    );
  }

  Widget _buildBody(ConversasState state) {
    if (state.isLoading && state.items.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    if (state.error != null && state.items.isEmpty) {
      return ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _StatePanel(
            icon: Icons.error_outline_rounded,
            title: 'Não foi possível carregar as conversas',
            subtitle: state.error!,
          ),
        ],
      );
    }

    if (state.items.isEmpty) {
      return ListView(
        padding: const EdgeInsets.all(20),
        children: const [
          _StatePanel(
            icon: Icons.forum_outlined,
            title: 'Nenhuma conversa ainda',
            subtitle:
                'Quando um serviço for solicitado ou realizado, o chat com a outra pessoa aparecerá aqui.',
          ),
        ],
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      itemBuilder: (context, index) {
        final conversa = state.items[index];
        return _ConversaTile(
          conversa: conversa,
          onTap: () => _abrirChat(conversa),
        );
      },
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemCount: state.items.length,
    );
  }

  void _abrirChat(ChatConversa conversa) {
    final user = ref.read(authStateProvider).user;
    final isPrestador = user?.tipo.isPrestador ?? false;
    final chamado = Chamado(
      id: conversa.servicoId,
      descricao: conversa.descricao ?? conversa.servicoNome ?? 'Atendimento',
      status: conversa.status,
      profissionalId: isPrestador ? (user?.id ?? 0) : conversa.outroUsuarioId,
      profissionalNome: isPrestador ? user?.nome : conversa.outroUsuarioNome,
      cidadaoId: isPrestador ? conversa.outroUsuarioId : user?.id,
      cidadaoNome: isPrestador ? conversa.outroUsuarioNome : user?.nome,
      preco: conversa.preco,
      servicoNome: conversa.servicoNome,
      enderecoAtendimento: conversa.enderecoAtendimento,
      agendadoPara: conversa.agendadoPara?.toIso8601String(),
    );

    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => ChatScreen(chamado: chamado)),
    ).then((_) => ref.read(conversasProvider.notifier).carregar());
  }
}

class _ConversaTile extends StatelessWidget {
  const _ConversaTile({
    required this.conversa,
    required this.onTap,
  });

  final ChatConversa conversa;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final date = conversa.ultimaMensagemEm ?? conversa.agendadoPara;
    final unread = conversa.naoLidas > 0;
    final resumoMensagem = conversa.ultimaMensagem?.isNotEmpty == true
        ? conversa.ultimaMensagem!
        : 'Sem mensagens ainda';
    final statusLeitura = unread
        ? '${conversa.naoLidas} mensagens nao lidas'
        : 'sem mensagens nao lidas';

    return Material(
      color:
          unread ? AppColors.primary.withValues(alpha: 0.12) : context.appCard,
      borderRadius: BorderRadius.circular(18),
      child: Semantics(
        button: true,
        label: 'Abrir conversa com ${conversa.outroUsuarioNome}. '
            '${conversa.servicoNome ?? conversa.descricao ?? 'Servico'}. '
            '$resumoMensagem. $statusLeitura',
        onTap: onTap,
        child: InkWell(
          excludeFromSemantics: true,
          onTap: onTap,
          borderRadius: BorderRadius.circular(18),
          child: ExcludeSemantics(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  ProfileAvatar(
                    name: conversa.outroUsuarioNome,
                    imageUrl:
                        ApiConfig.resolveAssetUrl(conversa.outroUsuarioFotoUrl),
                    radius: 25,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                conversa.outroUsuarioNome,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context)
                                    .textTheme
                                    .titleSmall
                                    ?.copyWith(
                                      fontWeight: FontWeight.w900,
                                    ),
                              ),
                            ),
                            if (date != null)
                              Text(
                                DateFormat('dd/MM HH:mm')
                                    .format(date.toLocal()),
                                style: Theme.of(context)
                                    .textTheme
                                    .labelSmall
                                    ?.copyWith(
                                      color: context.appTextSecondary,
                                    ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          conversa.servicoNome ??
                              conversa.descricao ??
                              'Serviço',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style:
                              Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: context.appBrand,
                                    fontWeight: FontWeight.w700,
                                  ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          conversa.ultimaMensagem?.isNotEmpty == true
                              ? conversa.ultimaMensagem!
                              : 'Toque para iniciar a conversa',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style:
                              Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: context.appTextSecondary,
                                  ),
                        ),
                      ],
                    ),
                  ),
                  if (unread) ...[
                    const SizedBox(width: 10),
                    CircleAvatar(
                      radius: 12,
                      backgroundColor: AppColors.statusRecusado,
                      child: Text(
                        conversa.naoLidas > 9 ? '9+' : '${conversa.naoLidas}',
                        style: const TextStyle(
                          color: AppColors.actionForeground,
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _StatePanel extends StatelessWidget {
  const _StatePanel({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: context.appCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: context.appBorder),
      ),
      child: Column(
        children: [
          Icon(icon, color: AppColors.primary, size: 42),
          const SizedBox(height: 16),
          Text(
            title,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: context.appTextSecondary,
                  height: 1.35,
                ),
          ),
        ],
      ),
    );
  }
}
