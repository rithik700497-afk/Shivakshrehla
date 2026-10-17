import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../config.dart';
import '../models.dart';
import '../state/cart.dart';
import '../state/catalog.dart';
import '../theme.dart';
import '../widgets/common.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _cat = 'all';
  String _q = '';
  bool _vegOnly = false;

  @override
  Widget build(BuildContext context) {
    final cat = context.watch<Catalog>();
    final cart = context.watch<Cart>();

    final shown = cat.items.where((i) {
      if (_cat != 'all' && i.category != _cat) return false;
      if (_vegOnly && !i.veg) return false;
      if (_q.isNotEmpty && !i.name.toLowerCase().contains(_q.toLowerCase())) return false;
      return true;
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(cat.restaurantName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
          if (cat.restaurantSubtitle.isNotEmpty) Text(cat.restaurantSubtitle, style: const TextStyle(fontSize: 12, color: kMuted)),
        ]),
      ),
      body: RefreshIndicator(
        onRefresh: cat.load,
        child: cat.items.isEmpty && cat.loading
            ? const Center(child: CircularProgressIndicator())
            : cat.items.isEmpty && cat.error != null
                ? ListView(children: [SizedBox(height: 420, child: ErrorBox(message: cat.error!, onRetry: cat.load))])
                : CustomScrollView(slivers: [
                    if (!cat.store.acceptingOrders)
                      SliverToBoxAdapter(child: _ClosedBanner(text: cat.store.closedReason.isNotEmpty ? cat.store.closedReason : 'We are not taking online orders right now.')),
                    if (cat.store.bannerText.isNotEmpty && cat.store.acceptingOrders)
                      SliverToBoxAdapter(child: _InfoBanner(text: cat.store.bannerText)),
                    if (cat.banners.isNotEmpty) SliverToBoxAdapter(child: _BannerCarousel(banners: cat.banners)),
                    if (cat.store.offers.isNotEmpty) SliverToBoxAdapter(child: _Offers(offers: cat.store.offers)),
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                        child: Row(children: [
                          Expanded(
                            child: TextField(
                              onChanged: (v) => setState(() => _q = v.trim()),
                              decoration: const InputDecoration(hintText: 'Search dishes', prefixIcon: Icon(Icons.search), isDense: true),
                            ),
                          ),
                          const SizedBox(width: 10),
                          FilterChip(label: const Text('Veg'), selected: _vegOnly, onSelected: (v) => setState(() => _vegOnly = v), selectedColor: const Color(0xFFD7F0DD), avatar: const VegDot(veg: true)),
                        ]),
                      ),
                    ),
                    SliverToBoxAdapter(
                      child: SizedBox(
                        height: 52,
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          children: [
                            for (final c in cat.categories)
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 4),
                                child: ChoiceChip(label: Text(c.label), selected: _cat == c.id, onSelected: (_) => setState(() => _cat = c.id), selectedColor: kGreen, labelStyle: TextStyle(color: _cat == c.id ? Colors.white : kInk, fontWeight: FontWeight.w600)),
                              ),
                          ],
                        ),
                      ),
                    ),
                    if (shown.isEmpty)
                      const SliverFillRemaining(hasScrollBody: false, child: Center(child: Text('No dishes found', style: TextStyle(color: kMuted))))
                    else
                      SliverPadding(
                        padding: EdgeInsets.fromLTRB(16, 4, 16, cart.isEmpty ? 24 : 96),
                        sliver: SliverList.separated(
                          itemCount: shown.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (_, i) => _DishCard(item: shown[i], orderingOpen: cat.store.acceptingOrders),
                        ),
                      ),
                  ]),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
      floatingActionButton: cart.isEmpty
          ? null
          : SizedBox(
              width: MediaQuery.of(context).size.width - 32,
              child: FilledButton(
                onPressed: () => context.go('/cart'),
                child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Text('${cart.count} item${cart.count == 1 ? '' : 's'}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                  Text('View cart  ·  ${money(cart.subtotal)}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                ]),
              ),
            ),
    );
  }
}

class _DishCard extends StatelessWidget {
  const _DishCard({required this.item, required this.orderingOpen});
  final MenuItem item;
  final bool orderingOpen;
  @override
  Widget build(BuildContext context) {
    final cart = context.watch<Cart>();
    final qty = cart.qtyOf(item.id);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              VegDot(veg: item.veg),
              const SizedBox(height: 6),
              Text(item.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15.5)),
              const SizedBox(height: 2),
              Text(money(item.price), style: const TextStyle(fontWeight: FontWeight.w700)),
              if (item.description.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(item.description, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: kMuted, fontSize: 12.5, height: 1.3)),
              ],
            ]),
          ),
          const SizedBox(width: 12),
          Column(children: [
            DishImage(item),
            const SizedBox(height: 8),
            if (!item.available)
              const Text('Sold out', style: TextStyle(color: Color(0xFFB42318), fontWeight: FontWeight.w700, fontSize: 12))
            else
              QtyStepper(qty: qty, onAdd: () => orderingOpen ? cart.add(item) : toast(context, 'Online ordering is closed right now'), onRemove: () => cart.remove(item)),
          ]),
        ]),
      ),
    );
  }
}

class _ClosedBanner extends StatelessWidget {
  const _ClosedBanner({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        color: const Color(0xFFFDECEA),
        padding: const EdgeInsets.all(12),
        child: Row(children: [const Icon(Icons.lock_clock, color: Color(0xFFB42318)), const SizedBox(width: 10), Expanded(child: Text(text, style: const TextStyle(color: Color(0xFF7A1A12), fontWeight: FontWeight.w600)))]),
      );
}

class _InfoBanner extends StatelessWidget {
  const _InfoBanner({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) => Container(width: double.infinity, color: kGreenSoft, padding: const EdgeInsets.all(12), child: Text(text, style: const TextStyle(color: kGreenDark, fontWeight: FontWeight.w600)));
}

class _Offers extends StatelessWidget {
  const _Offers({required this.offers});
  final List<Offer> offers;
  @override
  Widget build(BuildContext context) => SizedBox(
        height: 70,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          itemCount: offers.length,
          separatorBuilder: (_, __) => const SizedBox(width: 10),
          itemBuilder: (_, i) => Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: kGreen.withValues(alpha: .3))),
            child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('🎁 ${offers[i].title}', style: const TextStyle(fontWeight: FontWeight.w800, color: kGreenDark)),
              if (offers[i].description.isNotEmpty) Text(offers[i].description, style: const TextStyle(fontSize: 12, color: kMuted)),
            ]),
          ),
        ),
      );
}

class _BannerCarousel extends StatelessWidget {
  const _BannerCarousel({required this.banners});
  final List<HomeBanner> banners;
  @override
  Widget build(BuildContext context) => SizedBox(
        height: 150,
        child: PageView.builder(
          controller: PageController(viewportFraction: .92),
          itemCount: banners.length,
          itemBuilder: (_, i) {
            final b = banners[i];
            final img = absUrl(b.imageUrl);
            return Padding(
              padding: const EdgeInsets.fromLTRB(4, 12, 4, 0),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: Stack(fit: StackFit.expand, children: [
                  if (img.isNotEmpty) CachedNetworkImage(imageUrl: img, fit: BoxFit.cover, errorWidget: (_, __, ___) => Container(color: kGreen)) else Container(color: kGreen),
                  if (b.showText)
                    Container(
                      decoration: const BoxDecoration(gradient: LinearGradient(colors: [Colors.black54, Colors.transparent], begin: Alignment.bottomCenter, end: Alignment.topCenter)),
                      padding: const EdgeInsets.all(14),
                      alignment: Alignment.bottomLeft,
                      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                        if (b.eyebrow.isNotEmpty) Text(b.eyebrow, style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w700)),
                        Text(b.title, style: const TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.w800)),
                      ]),
                    ),
                ]),
              ),
            );
          },
        ),
      );
}
