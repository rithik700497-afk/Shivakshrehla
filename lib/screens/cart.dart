import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../core/api.dart';
import '../core/session.dart';
import '../models.dart';
import '../state/cart.dart';
import '../state/catalog.dart';
import '../theme.dart';
import '../widgets/common.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});
  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final _coupon = TextEditingController();
  final _notes = TextEditingController();
  List<Address> _addresses = [];
  String? _addressId;
  String? _couponMsg;
  double _couponDiscount = 0;
  bool _couponOk = false;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<Catalog>().refreshStore();
      _loadAddresses();
    });
  }

  Future<void> _loadAddresses() async {
    if (!context.read<Session>().loggedIn) return;
    try {
      final d = await context.read<Session>().api.get('/customers/me/addresses');
      final list = (d['addresses'] as List).map((e) => Address.fromJson(Map<String, dynamic>.from(e))).toList();
      if (!mounted) return;
      setState(() {
        _addresses = list;
        _addressId = list.any((a) => a.id == _addressId) ? _addressId : (list.isEmpty ? null : (list.firstWhere((a) => a.isDefault, orElse: () => list.first)).id);
      });
    } catch (_) {}
  }

  Future<void> _applyCoupon() async {
    final session = context.read<Session>();
    final cart = context.read<Cart>();
    if (!session.loggedIn) return toast(context, 'Please log in to use a coupon');
    final code = _coupon.text.trim();
    if (code.isEmpty) return;
    try {
      final d = await session.api.post('/coupons/validate', {
        'code': code,
        'orderType': cart.orderType,
        'items': cart.lines.map((l) => {'itemId': '${l.item.id}', 'qty': l.qty}).toList(),
      });
      setState(() {
        _couponOk = d['valid'] == true;
        _couponMsg = _couponOk ? '${d['title']} applied: −${money(d['discount'] as num)}' : (d['error'] ?? 'Coupon not valid').toString();
        _couponDiscount = _couponOk ? (d['discount'] as num).toDouble() : 0;
        cart.couponCode = _couponOk ? d['code'].toString() : null;
      });
    } on ApiException catch (e) {
      setState(() {
        _couponOk = false;
        _couponMsg = e.message;
      });
    }
  }

  Future<void> _place() async {
    final session = context.read<Session>();
    final cart = context.read<Cart>();
    final store = context.read<Catalog>().store;
    if (!session.loggedIn) {
      context.push('/login?next=/cart');
      return;
    }
    if (!store.acceptingOrders) return toast(context, store.closedReason.isEmpty ? 'Online ordering is closed right now' : store.closedReason);
    if (cart.orderType == 'delivery' && !store.deliveryEnabled) return toast(context, 'Delivery is switched off right now. Try takeaway.');
    if (cart.orderType == 'takeaway' && !store.takeawayEnabled) return toast(context, 'Takeaway is switched off right now.');
    if (cart.subtotal < store.minOrderAmount) return toast(context, 'Minimum order amount is ${money(store.minOrderAmount)}');
    if (cart.orderType == 'delivery' && _addressId == null) return toast(context, 'Please add a delivery address');
    setState(() => _busy = true);
    try {
      final d = await session.api.post('/orders', {
        'orderType': cart.orderType,
        'items': cart.lines.map((l) => {'itemId': l.item.id, 'qty': l.qty}).toList(),
        'contactPhone': session.customer!.phone10,
        if (cart.orderType == 'delivery') 'deliveryAddressId': _addressId,
        if (_notes.text.trim().isNotEmpty) 'notes': _notes.text.trim(),
        if (cart.couponCode != null) 'couponCode': cart.couponCode,
        'idempotencyKey': cart.idempotencyKey,
      });
      if (!mounted) return;
      final payable = (d['payable'] as num).toDouble();
      context.push('/pay/${d['id']}?amount=$payable&n=${Uri.encodeComponent('${d['orderNumber']}')}');
    } on ApiException catch (e) {
      if (mounted) toast(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<Cart>();
    final store = context.watch<Catalog>().store;
    final session = context.watch<Session>();
    final total = (cart.subtotal - _couponDiscount).clamp(0, double.infinity);

    if (cart.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Your cart')),
        body: Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Text('🛒', style: TextStyle(fontSize: 56)),
            const SizedBox(height: 10),
            const Text('Your cart is empty', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 14),
            FilledButton(onPressed: () => context.go('/'), style: FilledButton.styleFrom(minimumSize: const Size(180, 48)), child: const Text('Browse the menu')),
          ]),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Your cart'), actions: [TextButton(onPressed: cart.clear, child: const Text('Clear'))]),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Card(
          child: Column(children: [
            for (final l in cart.lines)
              ListTile(
                leading: VegDot(veg: l.item.veg),
                title: Text(l.item.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text(money(l.item.price)),
                trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                  QtyStepper(qty: l.qty, onAdd: () => cart.add(l.item), onRemove: () => cart.remove(l.item)),
                  SizedBox(width: 64, child: Text(money(l.item.price * l.qty), textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.w700))),
                ]),
              ),
          ]),
        ),
        const SectionTitle('Order type'),
        SegmentedButton<String>(
          segments: const [ButtonSegment(value: 'delivery', label: Text('Delivery'), icon: Icon(Icons.delivery_dining)), ButtonSegment(value: 'takeaway', label: Text('Takeaway'), icon: Icon(Icons.shopping_bag_outlined))],
          selected: {cart.orderType},
          onSelectionChanged: (s) => cart.setOrderType(s.first),
        ),
        if (cart.orderType == 'delivery') ...[
          const SectionTitle('Deliver to'),
          if (!session.loggedIn)
            const Card(child: ListTile(leading: Icon(Icons.lock_outline), title: Text('Log in to choose an address')))
          else if (_addresses.isEmpty)
            Card(child: ListTile(leading: const Icon(Icons.add_location_alt_outlined), title: const Text('Add a delivery address'), onTap: () async { await context.push('/addresses'); _loadAddresses(); }))
          else
            Card(
              child: Column(children: [
                for (final a in _addresses)
                  RadioListTile<String>(value: a.id, groupValue: _addressId, onChanged: (v) => setState(() => _addressId = v), title: Text(a.label, style: const TextStyle(fontWeight: FontWeight.w700)), subtitle: Text(a.oneLine)),
                ListTile(leading: const Icon(Icons.add), title: const Text('Manage addresses'), onTap: () async { await context.push('/addresses'); _loadAddresses(); }),
              ]),
            ),
        ],
        const SectionTitle('Coupon'),
        Row(children: [
          Expanded(child: TextField(controller: _coupon, textCapitalization: TextCapitalization.characters, decoration: const InputDecoration(hintText: 'Coupon code'))),
          const SizedBox(width: 10),
          FilledButton(onPressed: _applyCoupon, style: FilledButton.styleFrom(minimumSize: const Size(90, 50)), child: const Text('Apply')),
        ]),
        if (_couponMsg != null) Padding(padding: const EdgeInsets.only(top: 6, left: 4), child: Text(_couponMsg!, style: TextStyle(color: _couponOk ? kGreenDark : const Color(0xFFB42318), fontWeight: FontWeight.w600))),
        const SectionTitle('Note for the kitchen'),
        TextField(controller: _notes, maxLength: 500, maxLines: 2, onChanged: cart.setNotes, decoration: const InputDecoration(hintText: 'Less spicy, no onion… (optional)')),
        const SizedBox(height: 8),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(children: [
              _row('Items total', money(cart.subtotal)),
              if (_couponDiscount > 0) _row('Coupon', '−${money(_couponDiscount)}'),
              const Divider(),
              _row('To pay (offers applied at checkout)', money(total), bold: true),
              if (store.minOrderAmount > 0) Padding(padding: const EdgeInsets.only(top: 6), child: Text('Minimum order ${money(store.minOrderAmount)}', style: const TextStyle(color: kMuted, fontSize: 12.5))),
            ]),
          ),
        ),
        const SizedBox(height: 90),
      ]),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: FilledButton(onPressed: _busy ? null : _place, child: _busy ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white)) : Text(session.loggedIn ? 'Place order  ·  ${money(total)}' : 'Log in to order')),
        ),
      ),
    );
  }

  Widget _row(String a, String b, {bool bold = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Flexible(child: Text(a, style: TextStyle(fontWeight: bold ? FontWeight.w800 : FontWeight.w500))), Text(b, style: TextStyle(fontWeight: bold ? FontWeight.w800 : FontWeight.w600))]),
      );
}
