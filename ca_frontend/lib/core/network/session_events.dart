typedef SessionCallback = void Function();

/// Event bus leve para evitar ciclo de dependência Dio ↔ Riverpod Auth.
class SessionEvents {
  SessionEvents._();

  static final List<SessionCallback> _listeners = [];

  static void addListener(SessionCallback callback) {
    if (!_listeners.contains(callback)) {
      _listeners.add(callback);
    }
  }

  static void removeListener(SessionCallback callback) {
    _listeners.remove(callback);
  }

  static void notifyUnauthorized() {
    for (final listener in List<SessionCallback>.from(_listeners)) {
      listener();
    }
  }
}
