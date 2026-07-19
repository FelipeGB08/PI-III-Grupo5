import 'dart:convert';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../../firebase_options.dart';

/// Handler top-level para notificações em background.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  if (kDebugMode) {
    debugPrint('[FCM Background] ${message.notification?.title}');
  }
}

typedef NotificationTapCallback = void Function(Map<String, dynamic> data);

/// Serviço FCM para push em foreground, background e terminated.
class FirebaseMessagingService {
  FirebaseMessagingService._();
  static final FirebaseMessagingService instance = FirebaseMessagingService._();

  FirebaseMessaging? _messaging;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  bool _initialized = false;
  String? _currentToken;
  NotificationTapCallback? onNotificationTap;
  ValueChanged<String>? onTokenRefresh;

  String? get currentToken => _currentToken;

  Future<void> initialize() async {
    if (_initialized) return;

    try {
      final options = DefaultFirebaseOptions.currentPlatform;
      if (_isPlaceholderConfig(options)) {
        debugPrint('[FCM] Firebase ainda nao configurado para este ambiente.');
        return;
      }
      await Firebase.initializeApp(
        options: options,
      );
      _messaging = FirebaseMessaging.instance;
    } catch (e) {
      debugPrint('[FCM] Firebase não configurado: $e');
      return;
    }

    _initialized = true;
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    await _requestPermission();
    await _initLocalNotifications();
    await _setupToken();

    FirebaseMessaging.onMessage.listen(_onForegroundMessage);
    FirebaseMessaging.onMessageOpenedApp.listen(_onMessageOpened);
  }

  bool _isPlaceholderConfig(FirebaseOptions options) {
    return options.apiKey.startsWith('YOUR_') ||
        options.appId.startsWith('YOUR_') ||
        options.messagingSenderId.startsWith('YOUR_');
  }

  Future<void> _requestPermission() async {
    await _messaging?.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
  }

  Future<void> _initLocalNotifications() async {
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings();
    const settings = InitializationSettings(android: android, iOS: ios);

    await _localNotifications.initialize(
      settings,
      onDidReceiveNotificationResponse: (response) {
        if (response.payload != null) {
          final data = jsonDecode(response.payload!) as Map<String, dynamic>;
          onNotificationTap?.call(data);
        }
      },
    );

    const channel = AndroidNotificationChannel(
      'chamados_amauc',
      'Chamados AMAUC',
      description: 'Notificações de novos chamados e atualizações',
      importance: Importance.high,
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);
  }

  Future<void> _setupToken() async {
    final messaging = _messaging;
    if (messaging == null) return;

    try {
      final token = await messaging.getToken();
      _currentToken = token;
      if (kDebugMode) {
        debugPrint('[FCM] Token recebido.');
      }
      if (token != null && token.isNotEmpty) {
        onTokenRefresh?.call(token);
      }
      messaging.onTokenRefresh.listen((t) {
        _currentToken = t;
        if (kDebugMode) {
          debugPrint('[FCM] Token atualizado.');
        }
        onTokenRefresh?.call(t);
      });
    } catch (e) {
      debugPrint('[FCM] Nao foi possivel obter token: $e');
    }
  }

  void _onForegroundMessage(RemoteMessage message) {
    final notification = message.notification;
    if (notification == null) return;

    _localNotifications.show(
      notification.hashCode,
      notification.title,
      notification.body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'chamados_amauc',
          'Chamados AMAUC',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(),
      ),
      payload: jsonEncode(message.data),
    );
  }

  void _onMessageOpened(RemoteMessage message) {
    onNotificationTap?.call(message.data);
  }

  /// Tipos de evento esperados do backend via FCM data payload:
  /// - `novo_chamado` → notifica prestador
  /// - `chamado_aceito` → notifica cliente
  /// Outros tipos principais: `remarcacao_solicitada`,
  /// `remarcacao_aceita`, `remarcacao_recusada`, `chamado_concluido` e
  /// `avaliacao_recebida`.
  static String eventType(Map<String, dynamic> data) =>
      data['tipo']?.toString() ?? '';
}
