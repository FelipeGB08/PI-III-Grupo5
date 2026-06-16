import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config/amauc_constants.dart';
import '../../core/network/api_error_formatter.dart';
import '../../domain/entities/prestador.dart';
import '../../presentation/widgets/prestador_card.dart';
import '../../services/profissionais_service.dart';
import '../../presentation/providers/providers.dart';
import '../orcamentos/solicitar_orcamento_screen.dart';

class ProfissionaisFiltroScreen extends ConsumerStatefulWidget {
  const ProfissionaisFiltroScreen({super.key});

  @override
  ConsumerState<ProfissionaisFiltroScreen> createState() =>
      _ProfissionaisFiltroScreenState();
}

class _ProfissionaisFiltroScreenState
    extends ConsumerState<ProfissionaisFiltroScreen> {
  String _cidade = AmaucConstants.cidades.first;
  String? _categoriaId;
  List<Prestador> _profissionais = [];
  bool _carregando = false;
  String? _erro;

  @override
  void initState() {
    super.initState();
    _buscar();
  }

  Future<void> _buscar() async {
    setState(() {
      _carregando = true;
      _erro = null;
    });

    try {
      final service =
          ProfissionaisService(ref.read(dioClientProvider).instance);
      final lista = await service.listar(
        cidade: _cidade,
        categoria: _categoriaId,
      );
      if (!mounted) return;
      setState(() {
        _profissionais = lista;
        _carregando = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _erro = formatApiError(e);
        _carregando = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Buscar Profissionais')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                DropdownButtonFormField<String>(
                  value: _cidade,
                  decoration: const InputDecoration(
                    labelText: 'Cidade AMAUC',
                    border: OutlineInputBorder(),
                  ),
                  items: AmaucConstants.cidades
                      .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                      .toList(),
                  onChanged: (v) {
                    if (v == null) return;
                    setState(() => _cidade = v);
                    _buscar();
                  },
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String?>(
                  value: _categoriaId,
                  decoration: const InputDecoration(
                    labelText: 'Categoria / Ofício',
                    border: OutlineInputBorder(),
                  ),
                  items: [
                    const DropdownMenuItem(value: null, child: Text('Todas')),
                    ...AmaucConstants.categorias.map(
                      (c) => DropdownMenuItem(
                        value: c.id,
                        child: Text(c.nome),
                      ),
                    ),
                  ],
                  onChanged: (v) {
                    setState(() => _categoriaId = v);
                    _buscar();
                  },
                ),
              ],
            ),
          ),
          if (_erro != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(_erro!, style: const TextStyle(color: Colors.red)),
            ),
          Expanded(
            child: _carregando
                ? const Center(child: CircularProgressIndicator())
                : _profissionais.isEmpty
                    ? const Center(child: Text('Nenhum profissional encontrado.'))
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _profissionais.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final p = _profissionais[index];
                          return PrestadorCard(
                            prestador: p,
                            index: index,
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) =>
                                    SolicitarOrcamentoScreen(prestador: p),
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
