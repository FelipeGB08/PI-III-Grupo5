import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ca_frontend/core/theme/app_colors.dart'; 
import 'package:ca_frontend/domain/entities/prestador.dart';
import 'package:ca_frontend/presentation/providers/providers.dart';
import 'package:ca_frontend/presentation/screens/chamados/solicitar_servico_sheet.dart';

class PrestadorProfileScreen extends ConsumerStatefulWidget {
  const PrestadorProfileScreen({super.key, required this.prestador});
  final Prestador prestador;

  @override
  ConsumerState<PrestadorProfileScreen> createState() => _PrestadorProfileScreenState();
}

class _PrestadorProfileScreenState extends ConsumerState<PrestadorProfileScreen> {

  void _handleAgendarServico(Prestador p) {
    final authState = ref.read(authStateProvider); 
    if (authState.user == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Faça login para solicitar serviços.')));
      return;
    }
    SolicitarServicoSheet.show(context, p);
  }

  @override
  Widget build(BuildContext context) {
    final avaliacoesAsync = ref.watch(avaliacoesProvider(widget.prestador.id));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent, 
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: avaliacoesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => const Center(child: Text("Erro ao carregar", style: TextStyle(color: Colors.white))),
        data: (resumo) => Center(child: Text("Perfil de ${widget.prestador.nome}", style: const TextStyle(color: Colors.white))),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(20),
        child: ElevatedButton(
          onPressed: () => _handleAgendarServico(widget.prestador),
          child: const Text('Agendar'),
        ),
      ),
    );
  }
}