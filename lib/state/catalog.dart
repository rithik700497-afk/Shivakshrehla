import 'package:flutter/foundation.dart';
import '../core/api.dart';
import '../models.dart';

/// Menu, banners and "is the restaurant open" — everything the Home screen shows.
class Catalog extends ChangeNotifier {
  Catalog(this.api);
  final Api api;

  List<Category> categories = [];
  List<MenuItem> items = [];
  List<HomeBanner> banners = [];
  StoreStatus store = StoreStatus();
  String restaurantName = 'Royal Feast';
  String restaurantSubtitle = '';
  bool loading = false;
  String? error;

  Future<void> load() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      final r = await Future.wait([api.get('/menu'), api.get('/store-status'), api.get('/banners')]);
      final menu = Map<String, dynamic>.from(r[0]);
      categories = (menu['categories'] as List).map((e) => Category.fromJson(Map<String, dynamic>.from(e))).toList();
      items = (menu['items'] as List).map((e) => MenuItem.fromJson(Map<String, dynamic>.from(e))).toList();
      final rest = menu['restaurant'];
      if (rest is Map) {
        restaurantName = (rest['name'] ?? 'Royal Feast').toString();
        restaurantSubtitle = (rest['subtitle'] ?? '').toString();
      }
      store = StoreStatus.fromJson(Map<String, dynamic>.from(r[1]));
      banners = ((r[2]['banners'] as List?) ?? []).map((e) => HomeBanner.fromJson(Map<String, dynamic>.from(e))).toList();
    } on ApiException catch (e) {
      error = e.message;
    } catch (e) {
      error = 'Could not load the menu.';
    }
    loading = false;
    notifyListeners();
  }

  /// Light refresh of just the open/closed state (used before placing an order).
  Future<void> refreshStore() async {
    try {
      store = StoreStatus.fromJson(Map<String, dynamic>.from(await api.get('/store-status')));
      notifyListeners();
    } catch (_) {}
  }
}
