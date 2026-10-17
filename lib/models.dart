// Plain data classes that mirror the website's JSON (see app/api/restaurant/api/* in the server project).

double _d(dynamic v) => v is num ? v.toDouble() : double.tryParse('$v') ?? 0;
int _i(dynamic v) => v is num ? v.toInt() : int.tryParse('$v') ?? 0;
String _s(dynamic v) => v == null ? '' : '$v';

class Category {
  final String id;
  final String label;
  Category(this.id, this.label);
  factory Category.fromJson(Map<String, dynamic> j) => Category(_s(j['id']), _s(j['label']));
}

class MenuItem {
  final int id;
  final String name;
  final String category;
  final double price;
  final String description;
  final bool veg;
  final bool available;
  final String icon;
  final String image;
  MenuItem({required this.id, required this.name, required this.category, required this.price, required this.description, required this.veg, required this.available, required this.icon, required this.image});

  factory MenuItem.fromJson(Map<String, dynamic> j) => MenuItem(
        id: _i(j['id']),
        name: _s(j['name']),
        category: _s(j['category']),
        price: _d(j['price']),
        description: _s(j['description']),
        veg: _s(j['type']).toLowerCase() == 'veg',
        available: j['available'] != false,
        icon: _s(j['icon']),
        image: _s(j['image']),
      );

  // Saved cart lines keep a copy of the dish so the cart opens instantly (prices are re-checked by the server).
  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'category': category, 'price': price, 'description': description, 'type': veg ? 'veg' : 'nonveg', 'available': available, 'icon': icon, 'image': image};
}

class Offer {
  final int id;
  final String title;
  final String description;
  Offer(this.id, this.title, this.description);
  factory Offer.fromJson(Map<String, dynamic> j) => Offer(_i(j['id']), _s(j['title']), _s(j['description']));
}

class StoreStatus {
  final bool acceptingOrders;
  final String closedReason;
  final String bannerText;
  final bool deliveryEnabled;
  final bool takeawayEnabled;
  final double minOrderAmount;
  final List<Offer> offers;
  StoreStatus({this.acceptingOrders = true, this.closedReason = '', this.bannerText = '', this.deliveryEnabled = true, this.takeawayEnabled = true, this.minOrderAmount = 0, this.offers = const []});
  factory StoreStatus.fromJson(Map<String, dynamic> j) => StoreStatus(
        acceptingOrders: j['acceptingOrders'] != false,
        closedReason: _s(j['closedReason']),
        bannerText: _s(j['bannerText']),
        deliveryEnabled: j['deliveryEnabled'] != false,
        takeawayEnabled: j['takeawayEnabled'] != false,
        minOrderAmount: _d(j['minOrderAmount']),
        offers: ((j['offers'] as List?) ?? []).map((e) => Offer.fromJson(Map<String, dynamic>.from(e))).toList(),
      );
}

class HomeBanner {
  final int id;
  final String eyebrow;
  final String title;
  final String ctaText;
  final bool showText;
  final String imageUrl;
  HomeBanner({required this.id, required this.eyebrow, required this.title, required this.ctaText, required this.showText, required this.imageUrl});
  factory HomeBanner.fromJson(Map<String, dynamic> j) => HomeBanner(id: _i(j['id']), eyebrow: _s(j['eyebrow']), title: _s(j['title']), ctaText: _s(j['ctaText']), showText: j['showText'] == true, imageUrl: _s(j['imageUrl']));
}

class Address {
  final String id;
  final String label;
  final String addressLine;
  final String locality;
  final String city;
  final String pincode;
  final bool isDefault;
  Address({required this.id, required this.label, required this.addressLine, required this.locality, required this.city, required this.pincode, required this.isDefault});
  factory Address.fromJson(Map<String, dynamic> j) => Address(
        id: _s(j['id']),
        label: _s(j['label']),
        addressLine: _s(j['address_line'] ?? j['addressLine']),
        locality: _s(j['locality']),
        city: _s(j['city']),
        pincode: _s(j['pincode']),
        isDefault: j['is_default'] == true || j['isDefault'] == true,
      );
  String get oneLine => [addressLine, locality, city, pincode].where((e) => e.isNotEmpty).join(', ');
}

class Customer {
  final String id;
  final String name;
  final String phone;
  final String email;
  Customer({required this.id, required this.name, required this.phone, required this.email});
  factory Customer.fromJson(Map<String, dynamic> j) => Customer(id: _s(j['id']), name: _s(j['name']), phone: _s(j['phone']), email: _s(j['email']));
  /// The order API wants exactly 10 digits.
  String get phone10 {
    final digits = phone.replaceAll(RegExp(r'\D'), '');
    return digits.length >= 10 ? digits.substring(digits.length - 10) : digits;
  }
}

class OrderSummary {
  final String id;
  final String orderNumber;
  final String orderType;
  final String status;
  final double subtotal;
  final DateTime? createdAt;
  OrderSummary({required this.id, required this.orderNumber, required this.orderType, required this.status, required this.subtotal, this.createdAt});
  factory OrderSummary.fromJson(Map<String, dynamic> j) => OrderSummary(id: _s(j['id']), orderNumber: _s(j['orderNumber']), orderType: _s(j['orderType']), status: _s(j['status']), subtotal: _d(j['subtotal']), createdAt: DateTime.tryParse(_s(j['createdAt']))?.toLocal());
}

class OrderLine {
  final String name;
  final double price;
  final int qty;
  final double lineTotal;
  OrderLine(this.name, this.price, this.qty, this.lineTotal);
  factory OrderLine.fromJson(Map<String, dynamic> j) => OrderLine(_s(j['name']), _d(j['price']), _i(j['qty']), _d(j['lineTotal']));
}

class OrderDetail {
  final String id;
  final String orderNumber;
  final String orderType;
  final String status;
  final String paymentStatus;
  final String paymentMethod;
  final double subtotal;
  final double amountDue;
  final String notes;
  final DateTime? createdAt;
  final List<OrderLine> items;
  final String addressText;
  OrderDetail({required this.id, required this.orderNumber, required this.orderType, required this.status, required this.paymentStatus, required this.paymentMethod, required this.subtotal, required this.amountDue, required this.notes, required this.createdAt, required this.items, required this.addressText});
  factory OrderDetail.fromJson(Map<String, dynamic> j) {
    final a = j['deliveryAddress'] as Map?;
    return OrderDetail(
      id: _s(j['id']),
      orderNumber: _s(j['orderNumber']),
      orderType: _s(j['orderType']),
      status: _s(j['status']),
      paymentStatus: _s(j['paymentStatus']),
      paymentMethod: _s(j['paymentMethod']),
      subtotal: _d(j['subtotal']),
      amountDue: _d(j['amountDue'] ?? j['subtotal']),
      notes: _s(j['notes']),
      createdAt: DateTime.tryParse(_s(j['createdAt']))?.toLocal(),
      items: ((j['items'] as List?) ?? []).map((e) => OrderLine.fromJson(Map<String, dynamic>.from(e))).toList(),
      addressText: a == null ? '' : [a['addressLine'], a['locality'], a['city'], a['pincode']].where((e) => e != null && '$e'.isNotEmpty).join(', '),
    );
  }
}

class WalletTx {
  final String kind;
  final double amount;
  final String reason;
  final DateTime? createdAt;
  WalletTx(this.kind, this.amount, this.reason, this.createdAt);
  factory WalletTx.fromJson(Map<String, dynamic> j) => WalletTx(_s(j['kind']), _d(j['amount']), _s(j['reason']), DateTime.tryParse(_s(j['createdAt']))?.toLocal());
}
