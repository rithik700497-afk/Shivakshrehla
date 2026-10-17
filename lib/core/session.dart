import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models.dart';
import 'api.dart';
import 'push.dart';

/// Who is logged in. The login token lives in the phone's secure storage.
class Session extends ChangeNotifier {
  Session(this.api) {
    api.onUnauthorized = () {
      if (customer != null) _clear();
    };
  }

  final Api api;
  static const _store = FlutterSecureStorage();
  static const _key = 'rf_token';

  Customer? customer;
  bool ready = false;
  bool get loggedIn => customer != null;

  /// App start: restore the saved login (if any).
  Future<void> restore() async {
    try {
      final t = await _store.read(key: _key);
      if (t != null) {
        api.token = t;
        final d = await api.get('/customers/auth/me');
        customer = Customer.fromJson(Map<String, dynamic>.from(d['customer']));
        PushService.instance.registerForCustomer(api);
      }
    } on ApiException catch (e) {
      if (e.isUnauthorized) await _clear(notify: false);
      // offline at start: keep the token, the user is still logged in
    } catch (_) {}
    ready = true;
    notifyListeners();
  }

  Future<String?> sendOtp(String phone) async {
    final d = await api.post('/customers/auth/otp/send', {'phone': phone});
    return (d['isNewUser'] == true) ? 'new' : 'existing';
  }

  Future<void> verifyOtp(String phone, String otp, {String? name, Map<String, String>? address}) async {
    final d = await api.post('/customers/auth/otp/verify', {
      'phone': phone,
      'otp': otp,
      if (name != null && name.isNotEmpty) 'name': name,
      if (address != null) 'address': address,
    });
    final token = d['token'] as String?;
    if (token == null) throw ApiException('Login worked but the server did not return a session. Please update the server.');
    api.token = token;
    await _store.write(key: _key, value: token);
    customer = Customer.fromJson(Map<String, dynamic>.from(d['customer']));
    notifyListeners();
    PushService.instance.registerForCustomer(api);
  }

  Future<void> updateProfile(String name, String email) async {
    final d = await api.patch('/customers/me', {'name': name, 'email': email});
    customer = Customer.fromJson(Map<String, dynamic>.from(d['customer']));
    notifyListeners();
  }

  Future<void> logout() async {
    await PushService.instance.unregister(api);
    await _clear();
  }

  Future<void> deleteAccount() async {
    await api.delete('/customers/me', {'confirm': 'DELETE'});
    await PushService.instance.unregister(api);
    await _clear();
  }

  Future<void> _clear({bool notify = true}) async {
    api.token = null;
    customer = null;
    await _store.delete(key: _key);
    if (notify) notifyListeners();
  }
}
