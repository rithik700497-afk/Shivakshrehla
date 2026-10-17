import 'package:flutter_test/flutter_test.dart';
import 'package:royal_feast_app/models.dart';
import 'package:royal_feast_app/state/cart.dart';

MenuItem dish(int id, double price, {bool available = true}) => MenuItem(id: id, name: 'Dish $id', category: 'c', price: price, description: '', veg: true, available: available, icon: '', image: '');

void main() {
  test('add / remove / totals', () {
    final c = Cart();
    c.add(dish(1, 100));
    c.add(dish(1, 100));
    c.add(dish(2, 50));
    expect(c.count, 3);
    expect(c.subtotal, 250);
    c.remove(dish(1, 100));
    expect(c.qtyOf(1), 1);
    c.remove(dish(1, 100));
    expect(c.qtyOf(1), 0);
  });

  test('a changed cart gets a new idempotency key', () {
    final c = Cart();
    final k = c.idempotencyKey;
    c.add(dish(1, 100));
    expect(c.idempotencyKey == k, false);
  });

  test('syncWithMenu re-prices and drops sold-out dishes', () {
    final c = Cart();
    c.add(dish(1, 100));
    c.add(dish(2, 50));
    c.syncWithMenu([dish(1, 120), dish(2, 50, available: false)]);
    expect(c.subtotal, 120);
    expect(c.qtyOf(2), 0);
  });

  test('phone10 keeps the last 10 digits', () {
    expect(Customer(id: '1', name: 'A', phone: '+91 98765 43210', email: '').phone10, '9876543210');
  });
}
