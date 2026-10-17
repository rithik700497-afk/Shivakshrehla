// Build-time settings. Pass your real server with:
//   flutter run  --dart-define=API_BASE=https://order.yourdomain.com
//   flutter build appbundle --dart-define=API_BASE=https://order.yourdomain.com
const String apiBase = String.fromEnvironment('API_BASE', defaultValue: 'https://theroyalfeast.in');

bool get apiBaseIsPlaceholder => apiBase.contains('yourdomain');

/// All customer endpoints live under this prefix on the website's server.
String get apiRoot => '$apiBase/api/restaurant/api';

/// Makes "/api/..../image" style paths from the server into full URLs.
String absUrl(String? path) {
  if (path == null || path.isEmpty) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return '$apiBase${path.startsWith('/') ? '' : '/'}$path';
}
