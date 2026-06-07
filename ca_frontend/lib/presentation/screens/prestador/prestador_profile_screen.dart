import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/amauc_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../domain/entities/avaliacao.dart' show Avaliacao, AvaliacoesResumo;
import '../../../domain/entities/prestador.dart';
import '../../providers/providers.dart';
import '../../widgets/animated_counter.dart';
import '../chamados/solicitar_servico_sheet.dart';

final avaliacoesProvider =
    FutureProvider.family<AvaliacoesResumo, int>((ref, prestadorId) {
  return ref
      .watch(avaliacaoRepositoryProvider)
      .listarDoProfissional(prestadorId);
});

class PrestadorProfileScreen extends ConsumerStatefulWidget {
  const PrestadorProfileScreen({super.key, required this.prestador});

  final Prestador prestador;

  @override
  ConsumerState<PrestadorProfileScreen> createState() =>
      _PrestadorProfileScreenState();
}

class _PrestadorProfileScreenState
    extends ConsumerState<PrestadorProfileScreen> {
  final _scrollController = ScrollController();
  int _avaliacoesPage = 1;
  static const _pageSize = 5;

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final avaliacoesAsync =
        ref.watch(avaliacoesProvider(widget.prestador.id));
    final theme = Theme.of(context);
    final p = widget.prestador;

    return Scaffold(
      body: avaliacoesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => _buildContent(theme, p, const AvaliacoesResumo(media: 0, avaliacoes: [])),
        data: (resumo) {
          final prestadorAtualizado = p.copyWith(
            mediaAvaliacao: resumo.media > 0 ? resumo.media : p.mediaAvaliacao,
          );
          return _buildContent(theme, prestadorAtualizado, resumo);
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => SolicitarServicoSheet.show(context, p),
        icon: const Icon(Icons.send_rounded),
        label: const Text('Solicitar Serviço'),
      ),
    );
  }

  Widget _buildContent(
    ThemeData theme,
    Prestador p,
    AvaliacoesResumo resumo,
  ) {
    final visibleAvaliacoes =
        resumo.avaliacoes.take(_avaliacoesPage * _pageSize).toList();

    return CustomScrollView(
      controller: _scrollController,
      slivers: [
        SliverAppBar(
          expandedHeight: 180,
          pinned: true,
          flexibleSpace: FlexibleSpaceBar(
            background: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppColors.primary.withValues(alpha: 0.3),
                    theme.scaffoldBackgroundColor,
                  ],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: Transform.translate(
            offset: const Offset(0, -40),
            child: Column(
              children: [
                _ProfileAvatar(prestador: p),
                const SizedBox(height: 12),
                Text(p.nome, style: theme.textTheme.headlineLarge?.copyWith(fontSize: 24))
                    .animate()
                    .fadeIn(),
                const SizedBox(height: 4),
                Text(
                  p.bio ?? 'Profissional autônomo AMAUC',
                  style: theme.textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),
                _MetricasRow(
                  totalServicos: p.totalServicos,
                  media: resumo.media > 0 ? resumo.media : p.mediaAvaliacao,
                ),
                const SizedBox(height: 24),
                _PortfolioSection(prestador: p),
                const SizedBox(height: 24),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      'Avaliações',
                      style: theme.textTheme.titleLarge,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                if (visibleAvaliacoes.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(40),
                    child: Text(
                      'Nenhuma avaliação ainda',
                      style: theme.textTheme.bodyMedium,
                    ),
                  )
                else
                  ...visibleAvaliacoes.map((a) => _AvaliacaoTile(avaliacao: a)),
                if (visibleAvaliacoes.length < resumo.avaliacoes.length)
                  TextButton(
                    onPressed: () =>
                        setState(() => _avaliacoesPage++),
                    child: const Text('Carregar mais'),
                  ),
                const SizedBox(height: 100),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _ProfileAvatar extends StatelessWidget {
  const _ProfileAvatar({required this.prestador});

  final Prestador prestador;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: prestador.disponivel
              ? AppColors.statusConcluido
              : AppColors.muted,
          width: 3,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.2),
            blurRadius: 20,
          ),
        ],
      ),
      child: CircleAvatar(
        radius: 50,
        backgroundColor: AppColors.primary.withValues(alpha: 0.15),
        child: prestador.fotoUrl != null
            ? ClipOval(
                child: CachedNetworkImage(
                  imageUrl: prestador.fotoUrl!,
                  width: 100,
                  height: 100,
                  fit: BoxFit.cover,
                ),
              )
            : Text(
                prestador.nome.isNotEmpty ? prestador.nome[0] : '?',
                style: const TextStyle(
                  fontSize: 36,
                  fontWeight: FontWeight.w900,
                  color: AppColors.primary,
                ),
              ),
      ),
    );
  }
}

class _MetricasRow extends StatelessWidget {
  const _MetricasRow({required this.totalServicos, required this.media});

  final int totalServicos;
  final double media;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          Expanded(
            child: _MetricaCard(
              label: 'Serviços Realizados',
              child: AnimatedCounter(
                value: totalServicos.toDouble(),
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  color: AppColors.primary,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _MetricaCard(
              label: 'Nota Média',
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  AnimatedCounter(
                    value: media,
                    decimals: 1,
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      color: Colors.amber,
                    ),
                  ),
                  const Icon(Icons.star_rounded, color: Colors.amber),
                ],
              ),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: 200.ms);
  }
}

class _MetricaCard extends StatelessWidget {
  const _MetricaCard({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        children: [
          child,
          const SizedBox(height: 6),
          Text(label,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontSize: 11)),
        ],
      ),
    );
  }
}

class _PortfolioSection extends StatelessWidget {
  const _PortfolioSection({required this.prestador});

  final Prestador prestador;

  @override
  Widget build(BuildContext context) {
    final urls = prestador.portfolioUrls;
  final placeholders = List.generate(4, (i) => i);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Text('Portfólio', style: Theme.of(context).textTheme.titleLarge),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 120,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            scrollDirection: Axis.horizontal,
            itemCount: urls.isNotEmpty ? urls.length : placeholders.length,
            separatorBuilder: (_, __) => const SizedBox(width: 10),
            itemBuilder: (_, i) {
              return ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: urls.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl: urls[i],
                        width: 120,
                        height: 120,
                        fit: BoxFit.cover,
                      )
                    : Container(
                        width: 120,
                        height: 120,
                        color: Theme.of(context).cardTheme.color,
                        child: Icon(
                          AmaucConstants.categorias[i % 5].icon,
                          color: AppColors.muted,
                          size: 32,
                        ),
                      ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _AvaliacaoTile extends StatelessWidget {
  const _AvaliacaoTile({required this.avaliacao});

  final Avaliacao avaliacao;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                avaliacao.cidadaoNome ?? 'Cliente',
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
              const Spacer(),
              ...List.generate(
                5,
                (i) => Icon(
                  i < avaliacao.nota ? Icons.star : Icons.star_border,
                  size: 14,
                  color: Colors.amber,
                ),
              ),
            ],
          ),
          if (avaliacao.comentario != null) ...[
            const SizedBox(height: 6),
            Text(avaliacao.comentario!),
          ],
        ],
      ),
    );
  }
}
