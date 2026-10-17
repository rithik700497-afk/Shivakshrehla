import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import '../core/api.dart';
import '../core/session.dart';
import '../state/cart.dart';
import '../theme.dart';
import '../widgets/common.dart';

/// Shown right after the order is created: pay online (Razorpay), cash on delivery, or wallet.
/// The server decides what is paid — the app only sends the proof Razorpay returns and the server checks its signature.
class PaymentScreen extends StatefulWidget {
  const PaymentScreen({super.key, required this.orderId, required this.amount, required this.orderNumber});
  final String orderId;
  final double amount;
  final String orderNumber;
  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  final _rz = Razorpay();
  String? _rzOrderId;
  bool _busy = false;
  double _wallet = 0;

  Api get _api => context.read<Session>().api;

  @override
  void initState() {
    super.initState();
    _rz.on(Razorpay.EVENT_PAYMENT_SUCCESS, _onSuccess);
    _rz.on(Razorpay.EVENT_PAYMENT_ERROR, _onError);
    _rz.on(Razorpay.EVENT_EXTERNAL_WALLET, (_) {});
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadWallet());
  }

  @override
  void dispose() {
    _rz.clear();
    super.dispose();
  }

  Future<void> _loadWallet() async {
    try {
      final d = await _api.get('/customers/me/wallet');
      if (mounted) setState(() => _wallet = (d['balance'] as num).toDouble());
    } catch (_) {}
  }

  void _done() {
    context.read<Cart>().clear();
    context.go('/track/${widget.orderId}');
  }

  Future<void> _payOnline() async {
    setState(() => _busy = true);
    try {
      final d = await _api.post('/payments/orders/${widget.orderId}/initiate');
      _rzOrderId = d['razorpayOrderId'] as String;
      final c = context.read<Session>().customer;
      _rz.open({
        'key': d['keyId'],
        'amount': d['amount'],
        'currency': d['currency'] ?? 'INR',
        'order_id': _rzOrderId,
        'name': 'Royal Feast',
        'description': 'Order ${widget.orderNumber}',
        'prefill': {'contact': c?.phone10 ?? '', 'email': c?.email ?? ''},
        'theme': {'color': '#0D9488'},
        'retry': {'enabled': true, 'max_count': 3},
      });
    } on ApiException catch (e) {
      toast(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _onSuccess(PaymentSuccessResponse r) async {
    setState(() => _busy = true);
    try {
      await _api.post('/payments/orders/${widget.orderId}/verify', {
        'razorpay_payment_id': r.paymentId,
        'razorpay_order_id': r.orderId ?? _rzOrderId,
        'razorpay_signature': r.signature,
      });
      if (mounted) _done();
    } on ApiException catch (e) {
      // Money may have left the account; the server's webhook will still confirm it. Never ask them to pay twice.
      if (mounted) {
        toast(context, 'Payment received. Confirming… (${e.message})');
        _done();
      }
    }
  }

  void _onError(PaymentFailureResponse r) {
    if (mounted) toast(context, r.message ?? 'Payment was not completed. You can try again.');
  }

  Future<void> _cod() async {
    setState(() => _busy = true);
    try {
      await _api.post('/orders/${widget.orderId}/cod');
      if (mounted) _done();
    } on ApiException catch (e) {
      toast(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _payWallet() async {
    setState(() => _busy = true);
    try {
      await _api.post('/payments/orders/${widget.orderId}/wallet');
      if (mounted) _done();
    } on ApiException catch (e) {
      toast(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canWallet = _wallet >= widget.amount && widget.amount > 0;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) context.go('/track/${widget.orderId}'); // order exists; unpaid ones expire by themselves
      },
      child: Scaffold(
        appBar: AppBar(title: Text('Order ${widget.orderNumber}'), automaticallyImplyLeading: false),
        body: ListView(padding: const EdgeInsets.all(16), children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(children: [
                const Text('Amount to pay', style: TextStyle(color: kMuted)),
                const SizedBox(height: 4),
                Text(money(widget.amount), style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w800, color: kGreenDark)),
              ]),
            ),
          ),
          const SectionTitle('Choose how to pay'),
          _opt(Icons.account_balance_wallet_outlined, 'Pay online', 'UPI, cards, net banking, wallets', _payOnline),
          const SizedBox(height: 10),
          _opt(Icons.payments_outlined, 'Cash on delivery', 'Pay when your food arrives', _cod),
          if (canWallet) ...[const SizedBox(height: 10), _opt(Icons.savings_outlined, 'Royal Feast wallet', 'Balance ${money(_wallet)}', _payWallet)],
          if (_busy) const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator())),
        ]),
      ),
    );
  }

  Widget _opt(IconData i, String t, String s, VoidCallback f) => Card(
        child: ListTile(
          enabled: !_busy,
          onTap: f,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          leading: CircleAvatar(backgroundColor: kGreenSoft, child: Icon(i, color: kGreenDark)),
          title: Text(t, style: const TextStyle(fontWeight: FontWeight.w700)),
          subtitle: Text(s),
          trailing: const Icon(Icons.chevron_right),
        ),
      );
}
