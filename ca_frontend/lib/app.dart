import 'dart:async';

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

class _ConectaAmaucAppState extends ConsumerState<ConectaAmaucApp>
    with WidgetsBindingObserver {
  int? _ultimoUsuarioRegistrado;
  String? _ultimoTokenRegistrado;
  bool _registrandoToken = false;
  bool _atualizandoDados = false;
  bool _abrindoNotificacao = false;
  Map<String, dynamic>? _notificacaoPendente;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initFirebase();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    FirebaseMessagingService.instance.onNotificationReceived = null;
    FirebaseMessagingService.instance.onNotificationTap = null;
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(_atualizarDadosEmTempoReal());
    }
  }

  Future<void> _initFirebase() async {
    FirebaseMessagingService.instance.onNotificationTap = (data) {
      final tipo = FirebaseMessagingService.eventType(data);
      debugPrint('[FCM] Notificacao tocada: $tipo');
      _notificacaoPendente = Map<String, dynamic>.from(data);
      unawaited(_abrirNotificacaoPendente());
    };

    FirebaseMessagingService.instance.onNotificationReceived = (_) {
      unawaited(_atualizarDadosEmTempoReal());
    };

    FirebaseMessagingService.instance.onTokenRefresh = (token) {
      _registrarTokenPush(token);
    };

    await FirebaseMessagingService.instance.initialize();
    await _registrarTokenPush(FirebaseMessagingService.instance.currentToken);
  }

  Future<void> _abrirNotificacaoPendente() async {
    if (!mounted || _abrindoNotificacao) return;
    final data = _notificacaoPendente;
    final auth = ref.read(authStateProvider);
    final context = appNavigatorKey.currentContext;
    if (data == null || auth.user == null || context == null) return;

    _abrindoNotificacao = true;
    _notificacaoPendente = null;
    try {
      await NotificationNavigation.openFromPayload(
        context,
        ref,
        data,
        tipo: FirebaseMessagingService.eventType(data),
      );
    } finally {
      _abrindoNotificacao = false;
    }
  }

  Future<void> _atualizarDadosEmTempoReal() async {
    if (!mounted || _atualizandoDados) return;
    if (ref.read(authStateProvider).user == null) return;

    _atualizandoDados = true;
    try {
      await Future.wait<void>([
        ref.read(chamadosProvider.notifier).carregar(),
        ref.read(conversasProvider.notifier).carregar(),
        ref.read(notificacoesProvider.notifier).carregar(),
      ]);
    } catch (e) {
      debugPrint('[FCM] Falha ao atualizar dados do aplicativo: $e');
    } finally {
      _atualizandoDados = false;
    }
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
        unawaited(_abrirNotificacaoPendente());
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
