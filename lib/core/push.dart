import 'dart:async';
import 'dart:io';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../firebase_options.dart';
import 'api.dart';

/// Order notifications through Firebase Cloud Messaging.
/// The server (lib/restaurant/fcm.ts) already knows tokens saved as "fcm:<platform>:<token>".
/// If Firebase is not set up yet, everything here quietly does nothing.
class PushService {
  PushService._();
  static final instance = PushService._();

  bool available = false;
  String? _token;
  StreamSubscription? _refreshSub;

  /// Called from main() for notification taps: receives the page path from the server, e.g. "/order/track/<id>".
  void Function(String path)? onOpen;
  final messenger = GlobalKey<ScaffoldMessengerState>();

  String get _platform => Platform.isIOS ? 'ios' : 'android';

  Future<void> init() async {
    try {
      await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
      available = true;
    } catch (_) {
      available = false; // flutterfire configure has not been run yet
      return;
    }
    // Android 8+: the server sends order alerts to the channel called "orders".
    try {
      await FlutterLocalNotificationsPlugin()
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(const AndroidNotificationChannel('orders', 'Order updates', description: 'New orders and order status', importance: Importance.max));
    } catch (_) {}

    FirebaseMessaging.onMessage.listen((m) {
      // App is open: show a small banner instead of a system notification.
      final n = m.notification;
      final title = n?.title ?? m.data['title'] ?? '';
      final body = n?.body ?? m.data['body'] ?? '';
      if ('$title$body'.isEmpty) return;
      messenger.currentState?.showSnackBar(SnackBar(
        content: Text(body.isEmpty ? title : '$title\n$body'),
        action: SnackBarAction(label: 'VIEW', onPressed: () => _open(m)),
      ));
    });
    FirebaseMessaging.onMessageOpenedApp.listen(_open);
    final first = await FirebaseMessaging.instance.getInitialMessage();
    if (first != null) Future.delayed(const Duration(milliseconds: 600), () => _open(first));
  }

  void _open(RemoteMessage m) {
    final url = m.data['url'];
    if (url is String && url.startsWith('/')) onOpen?.call(url);
  }

  /// Asks permission (Android 13+/iOS) and tells the server this phone's token.
  Future<bool> registerForCustomer(Api api) async {
    if (!available) return false;
    try {
      final perm = await FirebaseMessaging.instance.requestPermission();
      if (perm.authorizationStatus == AuthorizationStatus.denied) return false;
      final t = await FirebaseMessaging.instance.getToken();
      if (t == null) return false;
      _token = t;
      await api.post('/push/subscribe', {'fcm': {'token': t, 'platform': _platform}});
      _refreshSub ??= FirebaseMessaging.instance.onTokenRefresh.listen((nt) async {
        _token = nt;
        try {
          await api.post('/push/subscribe', {'fcm': {'token': nt, 'platform': _platform}});
        } catch (_) {}
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> unregister(Api api) async {
    final t = _token;
    if (!available || t == null) return;
    try {
      await api.delete('/push/subscribe', {'endpoint': 'fcm:$_platform:$t'});
    } catch (_) {}
    _token = null;
  }
}
