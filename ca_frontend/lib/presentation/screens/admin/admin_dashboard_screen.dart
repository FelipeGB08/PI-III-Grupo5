import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../providers/providers.dart';

class AdminDashboardScreen extends ConsumerStatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  ConsumerState<AdminDashboardScreen> createState() =>
      _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends ConsumerState<AdminDashboardScreen> {
  final _categoriaController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(adminProvider.notifier).carregar();
    });
  }

  @override
  void dispose() {
    _categoriaController.dispose();
    super.dispose();
  }

  Future<void> _criarCategoria() async {
    final nome = _categoriaController.text.trim();
    if (nome.length < 2) return;
    final ok = await ref.read(adminProvider.notifier).criarCategoria(nome);
    if (!mounted) return;
    if (ok) {
      _categoriaController.clear();
      _mostrar('Categoria criada.');
    } else {
      _mostrar(ref.read(adminProvider).error ?? 'Nao foi possivel criar.');
    }
  }

  Future<void> _deletarCategoria(int id) async {
    final ok = await ref.read(adminProvider.notifier).deletarCategoria(id);
    if (!mounted) return;
    _mostrar(ok
        ? 'Categoria removida.'
        : ref.read(adminProvider).error ?? 'Nao foi possivel remover.');
  }

  void _mostrar(String mensagem) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(mensagem)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(adminProvider);
    final theme = Theme.of(context);
    final relatorio = state.relatorio ?? const {};
    final demandas = (relatorio['demandas_por_municipio'] as List?) ?? const [];
    final status = (relatorio['resumo_status'] as List?) ?? const [];

    return RefreshIndicator(
      onRefresh: () => ref.read(adminProvider.notifier).carregar(),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
        children: [
          Text(
            'Painel Admin',
            style: theme.textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Categorias e indicadores para demonstracao academica.',
            style: theme.textTheme.bodyMedium?.copyWith(color: AppColors.muted),
          ),
          const SizedBox(height: 24),
          if (state.isLoading)
            const Center(child: CircularProgressIndicator())
          else ...[
            if (state.error != null) ...[
              Text(
                state.error!,
                style: const TextStyle(color: AppColors.statusRecusado),
              ),
              const SizedBox(height: 12),
            ],
            _Section(
              title: 'Resumo por status',
              child: status.isEmpty
                  ? const Text('Sem dados ainda.')
                  : Column(
                      children: status.map((item) {
                        final map = item as Map;
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(map['status']?.toString() ?? '-'),
                          trailing: Text(map['quantidade']?.toString() ?? '0'),
                        );
                      }).toList(),
                    ),
            ),
            _Section(
              title: 'Demandas por municipio',
              child: demandas.isEmpty
                  ? const Text('Sem dados ainda.')
                  : Column(
                      children: demandas.map((item) {
                        final map = item as Map;
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(map['municipio']?.toString() ?? '-'),
                          trailing:
                              Text(map['total_demandas']?.toString() ?? '0'),
                        );
                      }).toList(),
                    ),
            ),
            _Section(
              title: 'Categorias',
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _categoriaController,
                          decoration: const InputDecoration(
                            labelText: 'Nova categoria',
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      IconButton.filled(
                        onPressed: _criarCategoria,
                        icon: const Icon(Icons.add_rounded),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ...state.categorias.map((categoria) {
                    final id = int.tryParse('${categoria['id']}') ?? 0;
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(categoria['nome_servico']?.toString() ?? '-'),
                      trailing: IconButton(
                        tooltip: 'Remover',
                        onPressed: id == 0 ? null : () => _deletarCategoria(id),
                        icon: const Icon(Icons.delete_outline_rounded),
                      ),
                    );
                  }),
                ],
              ),
            ),
          ],
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
    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
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
