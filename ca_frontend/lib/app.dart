import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/firebase/firebase_messaging_service.dart';
import 'core/theme/app_theme.dart';
import 'presentation/screens/home/home_shell.dart';

class ConectaAmaucApp extends ConsumerStatefulWidget {
  const ConectaAmaucApp({super.key});

  @override
  ConsumerState<ConectaAmaucApp> createState() => _ConectaAmaucAppState();
}

class _ConectaAmaucAppState extends ConsumerState<ConectaAmaucApp> {
  @override
  void initState() {
    super.initState();
    _initFirebase();
  }

  Future<void> _initFirebase() async {
    FirebaseMessagingService.instance.onNotificationTap = (data) {
      final tipo = FirebaseMessagingService.eventType(data);
      debugPrint('[FCM] Notificação tocada: $tipo');
      // Navega para Central de Chamados quando receber push de chamado
    };
    await FirebaseMessagingService.instance.initialize();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Conecta AMAUC',
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.system,
      home: const HomeShell(),
    );
  }
}
