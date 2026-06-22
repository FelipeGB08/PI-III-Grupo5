import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../domain/entities/prestador.dart';
import '../../providers/providers.dart';
import '../agendamentos/agendar_servico_screen.dart';

class PrestadorProfileScreen extends ConsumerWidget {
  const PrestadorProfileScreen({super.key, required this.prestador});

  final Prestador prestador;

  void _solicitarServico(BuildContext context, WidgetRef ref) {
    final authState = ref.read(authStateProvider);
    if (authState.user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Faca login para solicitar servicos.')),
      );
      return;
    }
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => AgendarServicoScreen(prestador: prestador),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final avaliacoesAsync = ref.watch(avaliacoesProvider(prestador.id));
    final favoritos = ref.watch(favoritosProvider);
    final isFavorito = favoritos.contains(prestador.id);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(prestador.nome),
        actions: [
          IconButton(
            tooltip: isFavorito ? 'Remover dos favoritos' : 'Salvar favorito',
            onPressed: () =>
                ref.read(favoritosProvider.notifier).toggle(prestador.id),
            icon: Icon(
              isFavorito ? Icons.favorite_rounded : Icons.favorite_border_rounded,
              color: isFavorito ? AppColors.statusRecusado : null,
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(20, 8, 20, 20),
        child: FilledButton.icon(
          onPressed: () => _solicitarServico(context, ref),
          icon: const Icon(Icons.calendar_month_rounded),
          label: const Text('Agendar servico'),
          style: FilledButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 16),
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 36,
                backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                child: Text(
                  prestador.nome.isNotEmpty
                      ? prestador.nome[0].toUpperCase()
                      : '?',
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      prestador.nome,
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      prestador.cidade,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: AppColors.muted,
                      ),
                    ),
                    if (prestador.anosExperiencia != null) ...[
                      const SizedBox(height: 6),
                      Text('${prestador.anosExperiencia} anos de experiencia'),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          _Section(
            title: 'Biografia',
            child: Text(
              prestador.bio?.isNotEmpty == true
                  ? prestador.bio!
                  : 'Profissional ainda nao cadastrou biografia.',
            ),
          ),
          if (prestador.categorias.isNotEmpty)
            _Section(
              title: 'Categorias',
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: prestador.categorias
                    .map((categoria) => Chip(label: Text(categoria)))
                    .toList(),
              ),
            ),
          if (prestador.curriculoTexto?.isNotEmpty == true)
            _Section(
              title: 'Curriculo Vivo',
              child: Text(prestador.curriculoTexto!),
            ),
          if (prestador.portfolioUrl?.isNotEmpty == true)
            _Section(
              title: 'Portfolio',
              child: SelectableText(prestador.portfolioUrl!),
            ),
          _Section(
            title: 'Avaliacoes',
            child: avaliacoesAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Text('Nao foi possivel carregar: $error'),
              data: (resumo) {
                if (resumo.avaliacoes.isEmpty) {
                  return const Text(
                      'Este profissional ainda nao recebeu avaliacoes.');
                }
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Media: ${resumo.media.toStringAsFixed(1)} estrelas',
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 12),
                    ...resumo.avaliacoes.take(5).map(
                          (a) => Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: Text(
                              '${a.nota} estrelas - ${a.comentario ?? 'Sem comentario'}',
                            ),
                          ),
                        ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}
