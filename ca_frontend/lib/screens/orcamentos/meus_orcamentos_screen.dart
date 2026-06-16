import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_error_formatter.dart';
import '../../domain/entities/chamado.dart';
import '../../domain/entities/user.dart';
import '../../services/servicos_service.dart';
import '../../presentation/providers/providers.dart';
import '../avaliacoes/avaliar_servico_screen.dart';

class MeusOrcamentosScreen extends ConsumerStatefulWidget {
  const MeusOrcamentosScreen({super.key});

  @override
  ConsumerState<MeusOrcamentosScreen> createState() =>
      _MeusOrcamentosScreenState();
}

class _MeusOrcamentosScreenState extends ConsumerState<MeusOrcamentosScreen> {
  List<Chamado> _orcamentos = [];
  bool _carregando = true;
  String? _erro;

  @override
  void initState() {
    super.initState();
    _carregar();
  }

  Future<void> _carregar() async {
    setState(() {
      _carregando = true;
      _erro = null;
    });

    try {
      final user = ref.read(authStateProvider).user;
      final service = ServicosService(ref.read(dioClientProvider).instance);
      final lista = user?.tipo.isPrestador ?? false
          ? await service.listarComoProfissional()
          : await service.listarComoCliente();

      if (!mounted) return;
      setState(() {
        _orcamentos = lista;
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

  Future<void> _abrirAvaliacao(Chamado chamado) async {
    final avaliou = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => AvaliarServicoScreen(chamado: chamado),
      ),
    );
    if (avaliou == true) await _carregar();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authStateProvider).user;
    final isPrestador = user?.tipo.isPrestador ?? false;

    return Scaffold(
      appBar: AppBar(title: const Text('Meus Orçamentos')),
      body: RefreshIndicator(
        onRefresh: _carregar,
        child: _carregando
            ? const Center(child: CircularProgressIndicator())
            : _erro != null
                ? ListView(
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(24),
                        child: Text(_erro!, textAlign: TextAlign.center),
                      ),
                    ],
                  )
                : _orcamentos.isEmpty
                    ? ListView(
                        children: const [
                          SizedBox(height: 120),
                          Center(child: Text('Nenhum orçamento encontrado.')),
                        ],
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _orcamentos.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final item = _orcamentos[index];
                          return Card(
                            child: ListTile(
                              title: Text(item.descricao),
                              subtitle: Text(
                                '${item.status.label}'
                                '${item.preco != null ? ' • R\$ ${item.preco!.toStringAsFixed(2)}' : ''}',
                              ),
                              trailing: !isPrestador &&
                                      item.status == ChamadoStatus.concluido
                                  ? IconButton(
                                      icon: const Icon(Icons.star_rounded),
                                      onPressed: () => _abrirAvaliacao(item),
                                    )
                                  : null,
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
