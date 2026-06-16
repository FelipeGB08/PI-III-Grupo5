import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../domain/entities/user.dart';
import '../../providers/providers.dart';
import '../auth/welcome_auth_screen.dart';
import '../chamados/chamados_screen.dart';
import '../cliente/cliente_dashboard_screen.dart';
import '../conta/minha_conta_screen.dart';

class HomeShell extends ConsumerWidget {
  const HomeShell({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);

    if (auth.isInitializing) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
    }

    if (auth.user == null) {
      return const WelcomeAuthScreen();
    }

    return _MainNavigation(isPrestador: auth.user!.tipo.isPrestador);
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
        ? const [ChamadosScreen(), MinhaContaScreen()]
        : const [ClienteDashboardScreen(), ChamadosScreen(), MinhaContaScreen()];

    final labels = widget.isPrestador
        ? ['Chamados', 'Conta']
        : ['Descobrir', 'Chamados', 'Conta'];

    final icons = widget.isPrestador
        ? [Icons.inbox_rounded, Icons.person_rounded]
        : [Icons.explore_rounded, Icons.assignment_rounded, Icons.person_rounded];

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
            type: BottomNavigationBarType.fixed,
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
