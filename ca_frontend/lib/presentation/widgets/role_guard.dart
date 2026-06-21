import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ca_frontend/presentation/providers/providers.dart';

class RoleGuard extends ConsumerWidget {
  final Widget child;
  final String requiredRole;

  const RoleGuard({required this.child, required this.requiredRole, super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);

    if (authState.user == null) {
      return const Scaffold(body: Center(child: Text("Usuário não logado.")));
    }

    // A CORREÇÃO ESTÁ AQUI: Usamos .name para comparar o Enum com a String
    if (authState.user!.tipo.name != requiredRole) {
      return Scaffold(
        body: Center(
          child: Text("Acesso negado: Requer perfil de $requiredRole"),
        ),
      );
    }

    return child;
  }
}
