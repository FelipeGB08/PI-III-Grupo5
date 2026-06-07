import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../domain/entities/user.dart';
import '../../providers/providers.dart';
import '../auth/welcome_auth_screen.dart';
import '../chamados/chamados_screen.dart';
import '../cliente/cliente_dashboard_screen.dart';

class HomeShell extends ConsumerWidget {
  const HomeShell({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authStateProvider).user;

    if (user == null) {
      return const WelcomeAuthScreen();
    }

    final isPrestador = user.tipo.isPrestador;

    return _MainNavigation(isPrestador: isPrestador);
  }
}

class _MainNavigation extends StatefulWidget {
  const _MainNavigation({required this.isPrestador});

  final bool isPrestador;

  @override
  State<_MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<_MainNavigation> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final pages = widget.isPrestador
        ? const [ChamadosScreen(), _PrestadorPlaceholder()]
        : const [ClienteDashboardScreen(), ChamadosScreen()];

    final labels = widget.isPrestador
        ? ['Chamados', 'Meu Perfil']
        : ['Descobrir', 'Chamados'];

  final icons = widget.isPrestador
        ? [Icons.inbox_rounded, Icons.person_rounded]
        : [Icons.explore_rounded, Icons.assignment_rounded];

    return Scaffold(
      body: SafeArea(child: pages[_index]),
      bottomNavigationBar: Container(
        margin: const EdgeInsets.fromLTRB(24, 0, 24, 20),
        decoration: BoxDecoration(
          color: Theme.of(context).cardTheme.color,
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.1),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: BottomNavigationBar(
            currentIndex: _index,
            onTap: (i) => setState(() => _index = i),
            backgroundColor: Colors.transparent,
            elevation: 0,
            selectedItemColor: AppColors.primary,
            unselectedItemColor: AppColors.muted,
            items: List.generate(labels.length, (i) {
              return BottomNavigationBarItem(
                icon: Icon(icons[i]),
                activeIcon: Icon(icons[i]),
                label: labels[i],
              );
            }),
          ),
        ),
      ),
    );
  }
}

class _PrestadorPlaceholder extends ConsumerWidget {
  const _PrestadorPlaceholder();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authStateProvider).user;

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 40),
          CircleAvatar(
            radius: 40,
            backgroundColor: AppColors.primary.withValues(alpha: 0.15),
            child: Text(
              user?.nome.isNotEmpty == true ? user!.nome[0] : '?',
              style: const TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.w900,
                color: AppColors.primary,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(user?.nome ?? '', style: Theme.of(context).textTheme.headlineLarge?.copyWith(fontSize: 22)),
          const SizedBox(height: 8),
          Text('Prestador AMAUC', style: Theme.of(context).textTheme.bodyMedium),
          const Spacer(),
          OutlinedButton.icon(
            onPressed: () => ref.read(authStateProvider.notifier).logout(),
            icon: const Icon(Icons.logout),
            label: const Text('Sair da Conta'),
          ),
        ],
      ),
    );
  }
}
