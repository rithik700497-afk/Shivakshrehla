import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../config.dart';

class ApiException implements Exception {
  final String message;
  final int status; // 0 = could not reach the server
  final String code;
  ApiException(this.message, {this.status = 0, this.code = ''});
  bool get isNetwork => status == 0;
  bool get isUnauthorized => status == 401;
  @override
  String toString() => message;
}

/// Thin JSON client for the Royal Feast server. Sends the saved login token as "Authorization: Bearer".
class Api {
  Api({this.token, this.onUnauthorized});

  String? token;
  void Function()? onUnauthorized;
  final http.Client _c = http.Client();

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-rf-client': 'app',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  Uri _u(String path, [Map<String, String>? q]) => Uri.parse('$apiRoot$path').replace(queryParameters: q);

  Future<dynamic> get(String path, {Map<String, String>? query}) => _send('GET', path, query: query);
  Future<dynamic> post(String path, [Object? body]) => _send('POST', path, body: body ?? {});
  Future<dynamic> put(String path, Object body) => _send('PUT', path, body: body);
  Future<dynamic> patch(String path, Object body) => _send('PATCH', path, body: body);
  Future<dynamic> delete(String path, [Object? body]) => _send('DELETE', path, body: body);

  Future<dynamic> _send(String method, String path, {Object? body, Map<String, String>? query}) async {
    final req = http.Request(method, _u(path, query))..headers.addAll(_headers);
    if (body != null && method != 'GET') req.body = jsonEncode(body);
    http.Response res;
    try {
      res = await http.Response.fromStream(await _c.send(req).timeout(const Duration(seconds: 20)));
    } on TimeoutException {
      throw ApiException('The server is taking too long. Please try again.');
    } on SocketException {
      throw ApiException('No internet connection.');
    } on http.ClientException {
      throw ApiException('No internet connection.');
    }
    dynamic data;
    if (res.body.isNotEmpty) {
      try {
        data = jsonDecode(utf8.decode(res.bodyBytes));
      } catch (_) {
        data = null;
      }
    }
    if (res.statusCode >= 200 && res.statusCode < 300) return data;
    final msg = (data is Map ? (data['message'] ?? data['error']) : null)?.toString() ?? 'Something went wrong (${res.statusCode}).';
    if (res.statusCode == 401) onUnauthorized?.call();
    throw ApiException(msg, status: res.statusCode, code: (data is Map ? data['error'] : null)?.toString() ?? '');
  }

  /// Cheap "is the server up" check used by the offline screen.
  Future<bool> health() async {
    try {
      final r = await _c.get(Uri.parse('$apiBase/api/health')).timeout(const Duration(seconds: 8));
      return r.statusCode == 200 && (jsonDecode(r.body)['ok'] == true);
    } catch (_) {
      return false;
    }
  }
}
