import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'screens/addresses.dart';
import 'screens/cart.dart';
import 'screens/home.dart';
import 'screens/login.dart';
import 'screens/orders.dart';
import 'screens/payment.dart';
import 'screens/profile.dart';
import 'state/cart.dart';
import 'theme.dart';

GoRouter buildRouter() => GoRouter(
      initialLocation: '/',
      routes: [
        StatefulShellRoute.indexedStack(
          builder: (context, state, shell) => _Shell(shell: shell),
          branches: [
            StatefulShellBranch(routes: [GoRoute(path: '/', builder: (_, __) => const HomeScreen())]),
            StatefulShellBranch(routes: [GoRoute(path: '/cart', builder: (_, __) => const CartScreen())]),
            StatefulShellBranch(routes: [GoRoute(path: '/orders', builder: (_, __) => const OrdersScreen())]),
            StatefulShellBranch(routes: [GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen())]),
          ],
        ),
        GoRoute(path: '/login', builder: (_, s) => LoginScreen(next: s.uri.queryParameters['next'])),
        GoRoute(path: '/addresses', builder: (_, __) => const AddressesScreen()),
        GoRoute(path: '/track/:id', builder: (_, s) => TrackScreen(orderId: s.pathParameters['id']!)),
        GoRoute(
          path: '/pay/:id',
          builder: (_, s) => PaymentScreen(
            orderId: s.pathParameters['id']!,
            amount: double.tryParse(s.uri.queryParameters['amount'] ?? '') ?? 0,
            orderNumber: s.uri.queryParameters['n'] ?? '',
          ),
        ),
      ],
    );

/// Turns the path the server puts in a notification ("/order/track/<id>") into an app screen.
String? routeForNotification(String path) {
  final m = RegExp(r'^/order/track/([^/?#]+)').firstMatch(path);
  if (m != null) return '/track/${m.group(1)}';
  if (path.startsWith('/order/orders')) return '/orders';
  return null;
}

class _Shell extends StatelessWidget {
  const _Shell({required this.shell});
  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context) {
    final count = context.watch<Cart>().count;
    return Scaffold(
      body: shell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: shell.currentIndex,
        indicatorColor: kGreenSoft,
        onDestinationSelected: (i) => shell.goBranch(i, initialLocation: i == shell.currentIndex),
        destinations: [
          const NavigationDestination(icon: Icon(Icons.restaurant_menu_outlined), selectedIcon: Icon(Icons.restaurant_menu, color: kGreenDark), label: 'Menu'),
          NavigationDestination(
            icon: Badge(isLabelVisible: count > 0, label: Text('$count'), child: const Icon(Icons.shopping_cart_outlined)),
            selectedIcon: Badge(isLabelVisible: count > 0, label: Text('$count'), child: const Icon(Icons.shopping_cart, color: kGreenDark)),
            label: 'Cart',
          ),
          const NavigationDestination(icon: Icon(Icons.receipt_long_outlined), selectedIcon: Icon(Icons.receipt_long, color: kGreenDark), label: 'Orders'),
          const NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person, color: kGreenDark), label: 'Profile'),
        ],
      ),
    );
  }
}
