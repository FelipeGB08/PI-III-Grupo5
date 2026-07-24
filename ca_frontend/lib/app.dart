import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/firebase/firebase_messaging_service.dart';
import 'core/theme/app_theme.dart';
import 'presentation/providers/providers.dart';
import 'presentation/navigation/notification_navigation.dart';
import 'presentation/screens/home/home_shell.dart';

final appNavigatorKey = GlobalKey<NavigatorState>();

class ConectaAmaucApp extends ConsumerStatefulWidget {
  const ConectaAmaucApp({super.key});

  @override
  ConsumerState<ConectaAmaucApp> createState() => _ConectaAmaucAppState();
}

class _ConectaAmaucAppState extends ConsumerState<ConectaAmaucApp> {
  int? _ultimoUsuarioRegistrado;
  String? _ultimoTokenRegistrado;
  bool _registrandoToken = false;

  @override
  void initState() {
    super.initState();
    _initFirebase();
  }

  Future<void> _initFirebase() async {
    FirebaseMessagingService.instance.onNotificationTap = (data) {
      final tipo = FirebaseMessagingService.eventType(data);
      debugPrint('[FCM] Notificacao tocada: $tipo');
      final context = appNavigatorKey.currentContext;
      if (context == null) return;
      NotificationNavigation.openFromPayload(
        context,
        ref,
        data,
        tipo: tipo,
      );
    };

    FirebaseMessagingService.instance.onTokenRefresh = (token) {
      _registrarTokenPush(token);
    };

    await FirebaseMessagingService.instance.initialize();
    await _registrarTokenPush(FirebaseMessagingService.instance.currentToken);
  }

  Future<void> _registrarTokenPush(String? token) async {
    if (!mounted || token == null || token.isEmpty || _registrandoToken) return;

    final user = ref.read(authStateProvider).user;
    if (user == null) return;

    if (_ultimoUsuarioRegistrado == user.id &&
        _ultimoTokenRegistrado == token) {
      return;
    }

    _registrandoToken = true;
    try {
      await ref.read(apiServiceProvider).registrarDeviceToken(
            token: token,
            plataforma: _plataformaAtual(),
          );
      _ultimoUsuarioRegistrado = user.id;
      _ultimoTokenRegistrado = token;
    } catch (e) {
      debugPrint('[FCM] Falha ao registrar token no backend: $e');
    } finally {
      _registrandoToken = false;
    }
  }

  String _plataformaAtual() {
    if (kIsWeb) return 'web';
    if (defaultTargetPlatform == TargetPlatform.android) return 'android';
    if (defaultTargetPlatform == TargetPlatform.iOS) return 'ios';
    return 'flutter';
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authStateProvider);
    if (auth.user == null) {
      _ultimoUsuarioRegistrado = null;
      _ultimoTokenRegistrado = null;
    } else {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _registrarTokenPush(FirebaseMessagingService.instance.currentToken);
      });
    }

    final themeMode = ref.watch(appThemeModeProvider);
    final highContrast = ref.watch(appHighContrastProvider);

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      navigatorKey: appNavigatorKey,
      title: 'Conecta AMAUC',
      theme: AppTheme.light(highContrast: highContrast),
      darkTheme: AppTheme.dark(highContrast: highContrast),
      highContrastTheme: AppTheme.light(highContrast: true),
      highContrastDarkTheme: AppTheme.dark(highContrast: true),
      themeMode: themeMode,
      home: const HomeShell(),
    );
  }
}
