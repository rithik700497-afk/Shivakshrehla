import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../core/api.dart';
import '../core/session.dart';
import '../theme.dart';
import '../widgets/common.dart';

/// Phone number -> OTP (-> name + address for a brand-new customer).
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, this.next});
  final String? next;
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phone = TextEditingController();
  final _otp = TextEditingController();
  final _name = TextEditingController();
  final _addr = TextEditingController();
  final _city = TextEditingController();
  final _pin = TextEditingController();
  int _step = 0; // 0 phone, 1 otp
  bool _isNew = false;
  bool _busy = false;
  String? _err;

  Future<void> _send() async {
    final p = _phone.text.replaceAll(RegExp(r'\D'), '');
    if (p.length < 10) return setState(() => _err = 'Enter your 10-digit mobile number.');
    setState(() {
      _busy = true;
      _err = null;
    });
    try {
      final r = await context.read<Session>().sendOtp(p);
      setState(() {
        _isNew = r == 'new';
        _step = 1;
      });
    } on ApiException catch (e) {
      setState(() => _err = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verify() async {
    final p = _phone.text.replaceAll(RegExp(r'\D'), '');
    if (_otp.text.trim().length != 6) return setState(() => _err = 'Enter the 6-digit OTP.');
    if (_isNew && (_name.text.trim().isEmpty || _addr.text.trim().isEmpty || _city.text.trim().isEmpty || _pin.text.trim().length != 6)) {
      return setState(() => _err = 'Please fill in your name and full delivery address (with 6-digit pincode).');
    }
    setState(() {
      _busy = true;
      _err = null;
    });
    try {
      await context.read<Session>().verifyOtp(
            p,
            _otp.text.trim(),
            name: _isNew ? _name.text.trim() : null,
            address: _isNew ? {'label': 'Home', 'addressLine': _addr.text.trim(), 'city': _city.text.trim(), 'pincode': _pin.text.trim()} : null,
          );
      if (mounted) context.go(widget.next ?? '/');
    } on ApiException catch (e) {
      setState(() => _err = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Log in')),
      body: ListView(padding: const EdgeInsets.all(20), children: [
        const SizedBox(height: 8),
        Center(child: ClipRRect(borderRadius: BorderRadius.circular(22), child: Image.asset('assets/icon.png', width: 84, height: 84))),
        const SizedBox(height: 18),
        Text(_step == 0 ? 'Welcome to Royal Feast' : 'Enter the OTP', textAlign: TextAlign.center, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
        const SizedBox(height: 6),
        Text(_step == 0 ? 'Log in with your mobile number to order.' : 'We sent a 6-digit code to ${_phone.text}.', textAlign: TextAlign.center, style: const TextStyle(color: kMuted)),
        const SizedBox(height: 22),
        if (_step == 0)
          TextField(controller: _phone, keyboardType: TextInputType.phone, maxLength: 13, decoration: const InputDecoration(labelText: 'Mobile number', prefixText: '+91  ', counterText: ''))
        else ...[
          TextField(controller: _otp, keyboardType: TextInputType.number, maxLength: 6, textAlign: TextAlign.center, style: const TextStyle(fontSize: 24, letterSpacing: 8, fontWeight: FontWeight.w700), decoration: const InputDecoration(counterText: '', hintText: '------')),
          if (_isNew) ...[
            const SizedBox(height: 14),
            const Text('New here! Tell us where to deliver.', style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            TextField(controller: _name, textCapitalization: TextCapitalization.words, decoration: const InputDecoration(labelText: 'Your name')),
            const SizedBox(height: 10),
            TextField(controller: _addr, decoration: const InputDecoration(labelText: 'House / street / area')),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: TextField(controller: _city, decoration: const InputDecoration(labelText: 'City'))),
              const SizedBox(width: 10),
              Expanded(child: TextField(controller: _pin, keyboardType: TextInputType.number, maxLength: 6, decoration: const InputDecoration(labelText: 'Pincode', counterText: ''))),
            ]),
          ],
        ],
        if (_err != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(_err!, style: const TextStyle(color: Color(0xFFB42318), fontWeight: FontWeight.w600))),
        const SizedBox(height: 18),
        FilledButton(onPressed: _busy ? null : (_step == 0 ? _send : _verify), child: _busy ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white)) : Text(_step == 0 ? 'Send OTP' : 'Verify & continue')),
        if (_step == 1) TextButton(onPressed: _busy ? null : () => setState(() { _step = 0; _otp.clear(); _err = null; }), child: const Text('Change number')),
      ]),
    );
  }
}
