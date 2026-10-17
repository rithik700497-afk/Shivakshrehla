import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import '../core/api.dart';
import '../theme.dart';

/// Wraps the whole app. When the phone loses internet (or the server is unreachable) it covers the screen with a friendly
/// "No Internet Connection" page. "Try Again" verifies BOTH the phone's connection and the server's /api/health.
class OfflineGate extends StatefulWidget {
  const OfflineGate({super.key, required this.api, required this.child});
  final Api api;
  final Widget child;
  @override
  State<OfflineGate> createState() => _OfflineGateState();
}

enum _Net { ok, offline, server }

class _OfflineGateState extends State<OfflineGate> {
  _Net _state = _Net.ok;
  bool _checking = false;
  StreamSubscription? _sub;

  @override
  void initState() {
    super.initState();
    _sub = Connectivity().onConnectivityChanged.listen((r) {
      final none = r.isEmpty || r.every((e) => e == ConnectivityResult.none);
      if (none) {
        if (mounted) setState(() => _state = _Net.offline);
      } else if (_state != _Net.ok) {
        _verify();
      }
    });
    _initialCheck();
  }

  Future<void> _initialCheck() async {
    final r = await Connectivity().checkConnectivity();
    if (r.isEmpty || r.every((e) => e == ConnectivityResult.none)) {
      if (mounted) setState(() => _state = _Net.offline);
    }
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  Future<void> _verify() async {
    setState(() => _checking = true);
    final r = await Connectivity().checkConnectivity();
    final none = r.isEmpty || r.every((e) => e == ConnectivityResult.none);
    _Net next;
    if (none) {
      next = _Net.offline;
    } else {
      next = (await widget.api.health()) ? _Net.ok : _Net.server;
    }
    if (mounted) setState(() {
      _state = next;
      _checking = false;
    });
  }

  @override
  Widget build(BuildContext context) => Stack(children: [
        widget.child,
        if (_state != _Net.ok) Positioned.fill(child: _OfflineScreen(state: _state, checking: _checking, onRetry: _verify)),
      ]);
}

class _OfflineScreen extends StatelessWidget {
  const _OfflineScreen({required this.state, required this.checking, required this.onRetry});
  final _Net state;
  final bool checking;
  final VoidCallback onRetry;

  static const _tips = [
    ('📶', 'Check Wi-Fi / data', 'Make sure Wi-Fi or mobile data is turned on.'),
    ('✈️', 'Airplane mode', 'Switch it off if it is on, then try again.'),
    ('📍', 'Better signal', 'Move closer to the router or to a spot with more bars.'),
    ('🔄', 'Reconnect', 'Turn Wi-Fi off and on once, or restart your phone.'),
  ];

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      child: SafeArea(
        top: false,
        child: ListView(padding: EdgeInsets.zero, children: [
          Container(
            padding: EdgeInsets.only(top: MediaQuery.of(context).padding.top + 28, bottom: 18),
            decoration: const BoxDecoration(color: kGreen, borderRadius: BorderRadius.vertical(bottom: Radius.circular(36))),
            child: const Center(child: Text('👨‍🍳', style: TextStyle(fontSize: 96))),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 22, 20, 24),
            child: Column(children: [
              const Text('No Internet Connection', style: TextStyle(fontSize: 23, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              const Text('We can’t reach Royal Feast right now. Your cart is saved on this phone — it will be waiting when you’re back online.', textAlign: TextAlign.center, style: TextStyle(color: kMuted, height: 1.5)),
              const SizedBox(height: 20),
              FilledButton(onPressed: checking ? null : onRetry, child: checking ? const Row(mainAxisSize: MainAxisSize.min, children: [SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white)), SizedBox(width: 10), Text('Checking…')]) : const Text('Try Again')),
              if (!checking)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(state == _Net.server ? 'You are online, but we cannot reach Royal Feast yet. Please try again in a minute.' : 'Still no internet on this phone. Please check the tips below.', textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFFB42318), fontSize: 13.5)),
                ),
              const SizedBox(height: 18),
              const Align(alignment: Alignment.centerLeft, child: Text('THINGS TO TRY', style: TextStyle(fontSize: 13, letterSpacing: .6, fontWeight: FontWeight.w800, color: kGreenDark))),
              const SizedBox(height: 10),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 1.15,
                children: [
                  for (final t in _tips)
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(color: kGreenSoft, borderRadius: BorderRadius.circular(16)),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Container(width: 34, height: 34, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)), alignment: Alignment.center, child: Text(t.$1, style: const TextStyle(fontSize: 18))),
                        const SizedBox(height: 6),
                        Text(t.$2, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                        const SizedBox(height: 2),
                        Text(t.$3, style: const TextStyle(fontSize: 12.5, color: kMuted, height: 1.35)),
                      ]),
                    ),
                ],
              ),
            ]),
          ),
        ]),
      ),
    );
  }
}
