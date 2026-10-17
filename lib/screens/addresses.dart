import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/api.dart';
import '../core/session.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets/common.dart';

class AddressesScreen extends StatefulWidget {
  const AddressesScreen({super.key});
  @override
  State<AddressesScreen> createState() => _AddressesScreenState();
}

class _AddressesScreenState extends State<AddressesScreen> {
  List<Address>? _list;
  String? _err;

  Api get _api => context.read<Session>().api;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    try {
      final d = await _api.get('/customers/me/addresses');
      if (mounted) setState(() {
        _list = (d['addresses'] as List).map((e) => Address.fromJson(Map<String, dynamic>.from(e))).toList();
        _err = null;
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _err = e.message);
    }
  }

  Future<void> _delete(Address a) async {
    try {
      await _api.delete('/customers/me/addresses/${a.id}');
      _load();
    } on ApiException catch (e) {
      if (mounted) toast(context, e.message);
    }
  }

  Future<void> _add() async {
    final label = TextEditingController(text: 'Home');
    final line = TextEditingController();
    final locality = TextEditingController();
    final city = TextEditingController();
    final pin = TextEditingController();
    var makeDefault = true;
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) => Padding(
          padding: EdgeInsets.fromLTRB(16, 4, 16, MediaQuery.of(ctx).viewInsets.bottom + 16),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: label, decoration: const InputDecoration(labelText: 'Label (Home, Work…)')),
            const SizedBox(height: 10),
            TextField(controller: line, decoration: const InputDecoration(labelText: 'House / street')),
            const SizedBox(height: 10),
            TextField(controller: locality, decoration: const InputDecoration(labelText: 'Area / landmark (optional)')),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: TextField(controller: city, decoration: const InputDecoration(labelText: 'City'))),
              const SizedBox(width: 10),
              Expanded(child: TextField(controller: pin, keyboardType: TextInputType.number, maxLength: 6, decoration: const InputDecoration(labelText: 'Pincode', counterText: ''))),
            ]),
            CheckboxListTile(contentPadding: EdgeInsets.zero, value: makeDefault, onChanged: (v) => setS(() => makeDefault = v ?? true), title: const Text('Make this my default address')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Save address')),
          ]),
        ),
      ),
    );
    if (ok != true) return;
    try {
      await _api.post('/customers/me/addresses', {
        'label': label.text.trim().isEmpty ? 'Home' : label.text.trim(),
        'addressLine': line.text.trim(),
        if (locality.text.trim().isNotEmpty) 'locality': locality.text.trim(),
        'city': city.text.trim(),
        'pincode': pin.text.trim(),
        'isDefault': makeDefault,
      });
      _load();
    } on ApiException catch (e) {
      if (mounted) toast(context, e.message);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('My addresses')),
        floatingActionButton: FloatingActionButton.extended(onPressed: _add, backgroundColor: kGreen, foregroundColor: Colors.white, icon: const Icon(Icons.add), label: const Text('Add address')),
        body: _err != null && _list == null
            ? ErrorBox(message: _err!, onRetry: _load)
            : _list == null
                ? const Center(child: CircularProgressIndicator())
                : _list!.isEmpty
                    ? const Center(child: Text('No saved addresses', style: TextStyle(color: kMuted)))
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                        itemCount: _list!.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (_, i) {
                          final a = _list![i];
                          return Card(
                            child: ListTile(
                              leading: const Icon(Icons.location_on_outlined, color: kGreen),
                              title: Row(children: [Text(a.label, style: const TextStyle(fontWeight: FontWeight.w700)), if (a.isDefault) const Padding(padding: EdgeInsets.only(left: 8), child: Chip(label: Text('Default'), visualDensity: VisualDensity.compact))]),
                              subtitle: Text(a.oneLine),
                              trailing: IconButton(icon: const Icon(Icons.delete_outline), onPressed: () => _delete(a)),
                            ),
                          );
                        },
                      ),
      );
}
