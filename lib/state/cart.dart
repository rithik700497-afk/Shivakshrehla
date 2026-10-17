import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models.dart';

class CartLine {
  final MenuItem item;
  int qty;
  CartLine(this.item, this.qty);
}

/// The cart lives on the phone (like the website's cart) and is re-priced by the server when you place the order.
class Cart extends ChangeNotifier {
  static const _key = 'rf_cart_v1';
  final Map<int, CartLine> _lines = {};
  String orderType = 'delivery'; // delivery | takeaway
  String notes = '';
  String? couponCode;
  String? addressId;
  // Same key for retries of the SAME order, so a double tap or a bad network can never create two orders.
  String idempotencyKey = _newKey();

  static String _newKey() {
    final r = Random.secure();
    return 'app-${DateTime.now().millisecondsSinceEpoch}-${List.generate(8, (_) => r.nextInt(16).toRadixString(16)).join()}';
  }

  List<CartLine> get lines => _lines.values.toList();
  int get count => _lines.values.fold(0, (a, l) => a + l.qty);
  double get subtotal => _lines.values.fold(0.0, (a, l) => a + l.item.price * l.qty);
  bool get isEmpty => _lines.isEmpty;
  int qtyOf(int id) => _lines[id]?.qty ?? 0;

  Future<void> load() async {
    try {
      final p = await SharedPreferences.getInstance();
      final raw = p.getString(_key);
      if (raw == null) return;
      final j = jsonDecode(raw) as Map<String, dynamic>;
      for (final l in (j['lines'] as List? ?? [])) {
        final item = MenuItem.fromJson(Map<String, dynamic>.from(l['item']));
        _lines[item.id] = CartLine(item, (l['qty'] as num).toInt());
      }
      orderType = j['orderType'] == 'takeaway' ? 'takeaway' : 'delivery';
      notifyListeners();
    } catch (_) {}
  }

  Future<void> _save() async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_key, jsonEncode({'orderType': orderType, 'lines': _lines.values.map((l) => {'item': l.item.toJson(), 'qty': l.qty}).toList()}));
  }

  void _changed() {
    idempotencyKey = _newKey(); // the cart changed, so this is a different order
    notifyListeners();
    _save();
  }

  void add(MenuItem item) {
    final l = _lines[item.id];
    if (l == null) {
      _lines[item.id] = CartLine(item, 1);
    } else if (l.qty < 50) {
      l.qty++;
    }
    _changed();
  }

  void remove(MenuItem item) {
    final l = _lines[item.id];
    if (l == null) return;
    if (l.qty <= 1) {
      _lines.remove(item.id);
    } else {
      l.qty--;
    }
    _changed();
  }

  void setOrderType(String t) {
    orderType = t;
    _changed();
  }

  void setNotes(String v) => notes = v;

  void clear() {
    _lines.clear();
    couponCode = null;
    notes = '';
    _changed();
  }

  /// Replaces cart prices with the latest menu (e.g. the owner changed a price) and drops dishes that are gone.
  void syncWithMenu(List<MenuItem> menu) {
    if (_lines.isEmpty) return;
    final byId = {for (final m in menu) m.id: m};
    var changed = false;
    for (final id in _lines.keys.toList()) {
      final fresh = byId[id];
      if (fresh == null || !fresh.available) {
        _lines.remove(id);
        changed = true;
      } else if (fresh.price != _lines[id]!.item.price) {
        _lines[id] = CartLine(fresh, _lines[id]!.qty);
        changed = true;
      }
    }
    if (changed) _changed();
  }
}
