import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../config.dart';
import '../models.dart';
import '../theme.dart';

String money(num v) {
  final whole = v == v.roundToDouble();
  return NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: whole ? 0 : 2).format(v);
}

void toast(BuildContext c, String msg) {
  ScaffoldMessenger.of(c)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(msg), behavior: SnackBarBehavior.floating));
}

class VegDot extends StatelessWidget {
  const VegDot({super.key, required this.veg});
  final bool veg;
  @override
  Widget build(BuildContext context) {
    final c = veg ? const Color(0xFF1B8A3A) : const Color(0xFFB42318);
    return Container(
      width: 16,
      height: 16,
      padding: const EdgeInsets.all(2.5),
      decoration: BoxDecoration(border: Border.all(color: c, width: 1.5), borderRadius: BorderRadius.circular(3)),
      child: DecoratedBox(decoration: BoxDecoration(color: c, shape: BoxShape.circle)),
    );
  }
}

class DishImage extends StatelessWidget {
  const DishImage(this.item, {super.key, this.size = 92});
  final MenuItem item;
  final double size;
  @override
  Widget build(BuildContext context) {
    final url = absUrl(item.image);
    final fallback = Container(width: size, height: size, color: kGreenSoft, alignment: Alignment.center, child: Text(item.icon.isEmpty ? '🍽️' : item.icon, style: TextStyle(fontSize: size * 0.4)));
    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: url.isEmpty
          ? fallback
          : CachedNetworkImage(imageUrl: url, width: size, height: size, fit: BoxFit.cover, placeholder: (_, __) => fallback, errorWidget: (_, __, ___) => fallback),
    );
  }
}

class QtyStepper extends StatelessWidget {
  const QtyStepper({super.key, required this.qty, required this.onAdd, required this.onRemove});
  final int qty;
  final VoidCallback onAdd;
  final VoidCallback onRemove;
  @override
  Widget build(BuildContext context) {
    if (qty == 0) {
      return OutlinedButton(
        onPressed: onAdd,
        style: OutlinedButton.styleFrom(foregroundColor: kGreen, side: const BorderSide(color: kGreen), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)), minimumSize: const Size(78, 36)),
        child: const Text('ADD', style: TextStyle(fontWeight: FontWeight.w800)),
      );
    }
    return Container(
      height: 36,
      decoration: BoxDecoration(color: kGreen, borderRadius: BorderRadius.circular(10)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        IconButton(onPressed: onRemove, icon: const Icon(Icons.remove, size: 18, color: Colors.white), padding: EdgeInsets.zero, constraints: const BoxConstraints(minWidth: 36, minHeight: 36)),
        Text('$qty', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
        IconButton(onPressed: onAdd, icon: const Icon(Icons.add, size: 18, color: Colors.white), padding: EdgeInsets.zero, constraints: const BoxConstraints(minWidth: 36, minHeight: 36)),
      ]),
    );
  }
}

class ErrorBox extends StatelessWidget {
  const ErrorBox({super.key, required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.cloud_off_rounded, size: 48, color: kMuted),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: kMuted)),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRetry, style: FilledButton.styleFrom(minimumSize: const Size(160, 48)), child: const Text('Try again')),
          ]),
        ),
      );
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.text, {super.key});
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(4, 18, 4, 8),
        child: Text(text.toUpperCase(), style: const TextStyle(fontSize: 12.5, letterSpacing: .6, fontWeight: FontWeight.w800, color: kGreenDark)),
      );
}
