import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'config.dart';
import 'core/api.dart';
import 'core/push.dart';
import 'core/session.dart';
import 'router.dart';
import 'screens/offline.dart';
import 'state/cart.dart';
import 'state/catalog.dart';
import 'theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (apiBaseIsPlaceholder) {
    runApp(const MaterialApp(home: Scaffold(body: Center(child: Padding(padding: EdgeInsets.all(24), child: Text('Set your server address first:\n\nflutter run --dart-define=API_BASE=https://your-site.com', textAlign: TextAlign.center))))));
    return;
  }

  final api = Api();
  final session = Session(api);
  final cart = Cart();
  final catalog = Catalog(api);
  final router = buildRouter();

  // Notification taps -> open the right screen.
  PushService.instance.onOpen = (path) {
    final r = routeForNotification(path);
    if (r != null) router.go(r);
  };

  runApp(
    MultiProvider(
      providers: [
        Provider<Api>.value(value: api),
        ChangeNotifierProvider.value(value: session),
        ChangeNotifierProvider.value(value: cart),
        ChangeNotifierProvider.value(value: catalog),
      ],
      child: MaterialApp.router(
        title: 'Royal Feast',
        debugShowCheckedModeBanner: false,
        theme: buildTheme(),
        routerConfig: router,
        scaffoldMessengerKey: PushService.instance.messenger,
        builder: (context, child) => OfflineGate(api: api, child: child ?? const SizedBox.shrink()),
      ),
    ),
  );

  // Everything below runs after the first frame, so the app opens instantly.
  await PushService.instance.init();
  await cart.load();
  await Future.wait([session.restore(), catalog.load()]);
  cart.syncWithMenu(catalog.items);
}
