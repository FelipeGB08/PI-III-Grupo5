import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../domain/entities/user.dart';
import '../../providers/providers.dart';
import '../admin/admin_dashboard_screen.dart';
import '../auth/welcome_auth_screen.dart';
import '../chamados/chamados_screen.dart';
import '../cliente/cliente_dashboard_screen.dart';
import '../cliente/cliente_home_screen.dart';
import '../conta/minha_conta_screen.dart';
import '../favoritos/favoritos_screen.dart';
import '../prestador/agenda_config_screen.dart';
import '../prestador/curriculo_profissional_screen.dart';

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

    return _MainNavigation(tipo: auth.user!.tipo);
  }
}

class _MainNavigation extends StatefulWidget {
  const _MainNavigation({required this.tipo});

  final UserTipo tipo;

  @override
  State<_MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<_MainNavigation> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final pages = widget.tipo.isAdmin
        ? const [AdminDashboardScreen(), MinhaContaScreen()]
        : widget.tipo.isPrestador
            ? const [
                ChamadosScreen(),
                AgendaConfigScreen(),
                CurriculoProfissionalScreen(),
                MinhaContaScreen(),
              ]
            : const [
                ClienteHomeScreen(),
                ClienteDashboardScreen(),
                ChamadosScreen(),
                FavoritosScreen(),
                MinhaContaScreen()
              ];

    final labels = widget.tipo.isAdmin
        ? ['Admin', 'Conta']
        : widget.tipo.isPrestador
            ? ['Chamados', 'Agenda', 'Curriculo', 'Conta']
            : ['Inicio', 'Explorar', 'Agenda', 'Favoritos', 'Conta'];

    final icons = widget.tipo.isAdmin
        ? [Icons.admin_panel_settings_rounded, Icons.person_rounded]
        : widget.tipo.isPrestador
            ? [
                Icons.inbox_rounded,
                Icons.event_available_rounded,
                Icons.badge_rounded,
                Icons.person_rounded,
              ]
            : [
                Icons.home_rounded,
                Icons.explore_rounded,
                Icons.calendar_month_rounded,
                Icons.favorite_rounded,
                Icons.person_rounded
              ];

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
