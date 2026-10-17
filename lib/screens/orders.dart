import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../core/api.dart';
import '../core/session.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets/common.dart';

Color statusColor(String s) => switch (s) {
      'COMPLETED' => const Color(0xFF1B8A3A),
      'CANCELLED' => const Color(0xFFB42318),
      _ => kGreenDark,
    };

String statusLabel(String s) => switch (s) {
      'PLACED' => 'Placed',
      'CONFIRMED' => 'Confirmed',
      'ACCEPTED' => 'Accepted',
      'PREPARING' => 'Being prepared',
      'READY' => 'Ready',
      'COMPLETED' => 'Completed',
      'CANCELLED' => 'Cancelled',
      _ => s.isEmpty ? '—' : '${s[0]}${s.substring(1).toLowerCase().replaceAll('_', ' ')}',
    };

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});
  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  List<OrderSummary>? _orders;
  String? _err;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final s = context.read<Session>();
    if (!s.loggedIn) return;
    try {
      final d = await s.api.get('/orders/mine/list');
      if (mounted) setState(() {
        _orders = (d['orders'] as List).map((e) => OrderSummary.fromJson(Map<String, dynamic>.from(e))).toList();
        _err = null;
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _err = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = context.watch<Session>();
    return Scaffold(
      appBar: AppBar(title: const Text('My orders')),
      body: !s.loggedIn
          ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Text('Log in to see your orders', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 14),
              FilledButton(onPressed: () => context.push('/login?next=/orders'), style: FilledButton.styleFrom(minimumSize: const Size(160, 48)), child: const Text('Log in')),
            ])))
          : _err != null && _orders == null
              ? ErrorBox(message: _err!, onRetry: _load)
              : _orders == null
                  ? const Center(child: CircularProgressIndicator())
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: _orders!.isEmpty
                          ? ListView(children: const [SizedBox(height: 200, child: Center(child: Text('No orders yet', style: TextStyle(color: kMuted))))])
                          : ListView.separated(
                              padding: const EdgeInsets.all(16),
                              itemCount: _orders!.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 10),
                              itemBuilder: (_, i) {
                                final o = _orders![i];
                                return Card(
                                  child: ListTile(
                                    onTap: () => context.push('/track/${o.id}'),
                                    title: Text('Order ${o.orderNumber}', style: const TextStyle(fontWeight: FontWeight.w700)),
                                    subtitle: Text('${o.createdAt == null ? '' : DateFormat('d MMM, h:mm a').format(o.createdAt!)} · ${o.orderType == 'delivery' ? 'Delivery' : o.orderType == 'takeaway' ? 'Takeaway' : 'Dine-in'}'),
                                    trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
                                      Text(money(o.subtotal), style: const TextStyle(fontWeight: FontWeight.w800)),
                                      Text(statusLabel(o.status), style: TextStyle(color: statusColor(o.status), fontWeight: FontWeight.w700, fontSize: 12)),
                                    ]),
                                  ),
                                );
                              },
                            ),
                    ),
    );
  }
}

/// Live order tracking. Refreshes by itself every few seconds until the order is finished.
class TrackScreen extends StatefulWidget {
  const TrackScreen({super.key, required this.orderId});
  final String orderId;
  @override
  State<TrackScreen> createState() => _TrackScreenState();
}

class _TrackScreenState extends State<TrackScreen> {
  OrderDetail? _o;
  String? _err;
  Timer? _t;

  static const _steps = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED'];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _load();
      _t = Timer.periodic(const Duration(seconds: 8), (_) {
        final st = _o?.status;
        if (st != 'COMPLETED' && st != 'CANCELLED') _load();
      });
    });
  }

  @override
  void dispose() {
    _t?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final d = await context.read<Session>().api.get('/orders/${widget.orderId}');
      if (mounted) setState(() {
        _o = OrderDetail.fromJson(Map<String, dynamic>.from(d['order'] ?? d));
        _err = null;
      });
    } on ApiException catch (e) {
      if (mounted && _o == null) setState(() => _err = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final o = _o;
    return Scaffold(
      appBar: AppBar(title: Text(o == null ? 'Order' : 'Order ${o.orderNumber}'), leading: BackButton(onPressed: () => context.canPop() ? context.pop() : context.go('/orders'))),
      body: o == null
          ? (_err != null ? ErrorBox(message: _err!, onRetry: _load) : const Center(child: CircularProgressIndicator()))
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(padding: const EdgeInsets.all(16), children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: o.status == 'CANCELLED'
                        ? const Row(children: [Icon(Icons.cancel, color: Color(0xFFB42318)), SizedBox(width: 10), Expanded(child: Text('This order was cancelled. Any online payment is refunded.', style: TextStyle(fontWeight: FontWeight.w600)))])
                        : Column(children: [
                            for (var i = 0; i < _steps.length; i++) _stepRow(_steps[i], i, _steps.indexOf(o.status == 'CONFIRMED' ? 'PLACED' : o.status)),
                          ]),
                  ),
                ),
                const SectionTitle('Items'),
                Card(
                  child: Column(children: [
                    for (final l in o.items) ListTile(dense: true, title: Text('${l.qty} × ${l.name}'), trailing: Text(money(l.lineTotal), style: const TextStyle(fontWeight: FontWeight.w700))),
                    const Divider(height: 1),
                    ListTile(title: const Text('Total', style: TextStyle(fontWeight: FontWeight.w800)), trailing: Text(money(o.amountDue), style: const TextStyle(fontWeight: FontWeight.w800))),
                  ]),
                ),
                const SectionTitle('Details'),
                Card(
                  child: Column(children: [
                    ListTile(dense: true, leading: const Icon(Icons.payments_outlined), title: Text(_payText(o))),
                    if (o.addressText.isNotEmpty) ListTile(dense: true, leading: const Icon(Icons.location_on_outlined), title: Text(o.addressText)),
                    if (o.notes.isNotEmpty) ListTile(dense: true, leading: const Icon(Icons.notes), title: Text(o.notes)),
                  ]),
                ),
                if (o.paymentStatus == 'PENDING' && o.status != 'CANCELLED')
                  Padding(
                    padding: const EdgeInsets.only(top: 14),
                    child: FilledButton(onPressed: () => context.push('/pay/${o.id}?amount=${o.amountDue}&n=${Uri.encodeComponent(o.orderNumber)}'), child: const Text('Complete payment')),
                  ),
              ]),
            ),
    );
  }

  String _payText(OrderDetail o) {
    if (o.paymentStatus == 'PAID') return 'Paid online';
    if (o.paymentStatus == 'COD_PENDING') return 'Cash on delivery — pay ${money(o.amountDue)} when it arrives';
    if (o.paymentStatus == 'PENDING') return 'Payment pending';
    return o.paymentStatus.isEmpty ? '—' : o.paymentStatus;
  }

  Widget _stepRow(String s, int i, int current) {
    final done = i <= current;
    return Row(children: [
      Column(children: [
        Icon(done ? Icons.check_circle : Icons.radio_button_unchecked, color: done ? kGreen : const Color(0xFFBFD0CC)),
        if (i < _steps.length - 1) Container(width: 2, height: 24, color: i < current ? kGreen : const Color(0xFFE0EAE7)),
      ]),
      const SizedBox(width: 12),
      Padding(padding: const EdgeInsets.only(bottom: 22), child: Text(statusLabel(s), style: TextStyle(fontWeight: i == current ? FontWeight.w800 : FontWeight.w500, color: done ? kInk : kMuted))),
    ]);
  }
}
