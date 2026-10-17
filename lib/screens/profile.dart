import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../config.dart';
import '../core/api.dart';
import '../core/push.dart';
import '../core/session.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets/common.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  double? _wallet;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadWallet());
  }

  Future<void> _loadWallet() async {
    final s = context.read<Session>();
    if (!s.loggedIn) return;
    try {
      final d = await s.api.get('/customers/me/wallet');
      if (mounted) setState(() => _wallet = (d['balance'] as num).toDouble());
    } catch (_) {}
  }

  Future<void> _edit() async {
    final s = context.read<Session>();
    final name = TextEditingController(text: s.customer!.name);
    final email = TextEditingController(text: s.customer!.email);
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Edit profile'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
          const SizedBox(height: 10),
          TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email (optional)')),
        ]),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')), TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Save'))],
      ),
    );
    if (ok != true) return;
    try {
      await s.updateProfile(name.text.trim(), email.text.trim());
      if (mounted) toast(context, 'Profile updated');
    } on ApiException catch (e) {
      if (mounted) toast(context, e.message);
    }
  }

  Future<void> _notifications() async {
    final s = context.read<Session>();
    final ok = await PushService.instance.registerForCustomer(s.api);
    if (!mounted) return;
    toast(context, ok ? 'Order notifications are on' : (PushService.instance.available ? 'Notifications are blocked. Allow them in your phone settings.' : 'Notifications are not set up in this build yet.'));
  }

  Future<void> _delete() async {
    final c = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete account?'),
        content: const Text('Your name, phone, email and saved addresses will be erased. Past orders are kept without personal details. This cannot be undone.'),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')), TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete', style: TextStyle(color: Color(0xFFB42318))))],
      ),
    );
    if (c != true) return;
    try {
      await context.read<Session>().deleteAccount();
      if (mounted) context.go('/');
    } on ApiException catch (e) {
      if (mounted) toast(context, e.message);
    }
  }

  Future<void> _open(String path) => launchUrl(Uri.parse('$apiBase$path'), mode: LaunchMode.externalApplication);

  @override
  Widget build(BuildContext context) {
    final s = context.watch<Session>();
    final Customer? c = s.customer;
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Card(
          child: ListTile(
            contentPadding: const EdgeInsets.all(16),
            leading: const CircleAvatar(radius: 26, backgroundColor: kGreenSoft, child: Icon(Icons.person, color: kGreenDark, size: 28)),
            title: Text(c?.name.isNotEmpty == true ? c!.name : 'Guest', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
            subtitle: Text(c == null ? 'Log in to order and track your food' : [c.phone, c.email].where((e) => e.isNotEmpty).join('\n')),
            trailing: c == null ? FilledButton(onPressed: () => context.push('/login'), style: FilledButton.styleFrom(minimumSize: const Size(90, 40)), child: const Text('Log in')) : IconButton(onPressed: _edit, icon: const Icon(Icons.edit_outlined)),
          ),
        ),
        if (c != null) ...[
          const SectionTitle('Account'),
          Card(
            child: Column(children: [
              ListTile(leading: const Icon(Icons.location_on_outlined), title: const Text('My addresses'), trailing: const Icon(Icons.chevron_right), onTap: () => context.push('/addresses')),
              ListTile(leading: const Icon(Icons.account_balance_wallet_outlined), title: const Text('Wallet'), trailing: Text(_wallet == null ? '' : money(_wallet!), style: const TextStyle(fontWeight: FontWeight.w800)), onTap: _loadWallet),
              ListTile(leading: const Icon(Icons.notifications_active_outlined), title: const Text('Order notifications'), subtitle: const Text('Tap to turn on / re-check'), onTap: _notifications),
            ]),
          ),
        ],
        const SectionTitle('Help'),
        Card(
          child: Column(children: [
            ListTile(leading: const Icon(Icons.support_agent_outlined), title: const Text('Contact us'), onTap: () => _open('/order/contact')),
            ListTile(leading: const Icon(Icons.privacy_tip_outlined), title: const Text('Privacy policy'), onTap: () => _open('/order/privacy')),
            ListTile(leading: const Icon(Icons.description_outlined), title: const Text('Terms'), onTap: () => _open('/order/terms')),
          ]),
        ),
        if (c != null) ...[
          const SizedBox(height: 18),
          OutlinedButton(onPressed: () async { await s.logout(); if (mounted) context.go('/'); }, style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(50), foregroundColor: kInk), child: const Text('Log out')),
          TextButton(onPressed: _delete, child: const Text('Delete my account', style: TextStyle(color: Color(0xFFB42318)))),
        ],
        const SizedBox(height: 20),
        const Center(child: Text('Royal Feast app 1.0.0', style: TextStyle(color: kMuted, fontSize: 12))),
      ]),
    );
  }
}
