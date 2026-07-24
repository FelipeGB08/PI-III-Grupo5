import 'package:dio/dio.dart';
import 'package:latlong2/latlong.dart';

class MapRouteResult {
  const MapRouteResult({
    required this.points,
    required this.distanceKm,
    required this.durationMinutes,
  });

  final List<LatLng> points;
  final double distanceKm;
  final double durationMinutes;
}

class MapRouteService {
  MapRouteService({
    Dio? dio,
    String baseUrl = 'https://router.project-osrm.org',
  })  : _baseUrl = baseUrl.replaceFirst(RegExp(r'/$'), ''),
        _dio = dio ??
            Dio(
              BaseOptions(
                connectTimeout: const Duration(seconds: 8),
                receiveTimeout: const Duration(seconds: 12),
              ),
            );

  final Dio _dio;
  final String _baseUrl;

  Future<MapRouteResult> drivingRoute({
    required LatLng origin,
    required LatLng destination,
  }) async {
    final url = '$_baseUrl/route/v1/driving/'
        '${origin.longitude},${origin.latitude};'
        '${destination.longitude},${destination.latitude}';

    final response = await _dio.get<Map<String, dynamic>>(
      url,
      queryParameters: const {
        'overview': 'full',
        'geometries': 'geojson',
        'alternatives': 'false',
        'steps': 'false',
      },
    );

    final routes = response.data?['routes'];
    if (routes is! List || routes.isEmpty) {
      throw Exception('Nenhuma rota encontrada.');
    }

    final route = routes.first;
    if (route is! Map<String, dynamic>) {
      throw Exception('Resposta de rota invalida.');
    }

    final geometry = route['geometry'];
    final coordinates =
        geometry is Map<String, dynamic> ? geometry['coordinates'] : null;
    if (coordinates is! List || coordinates.isEmpty) {
      throw Exception('Rota sem geometria.');
    }

    final points = coordinates.whereType<List>().where((coord) {
      return coord.length >= 2 && coord[0] is num && coord[1] is num;
    }).map((coord) {
      return LatLng(
        (coord[1] as num).toDouble(),
        (coord[0] as num).toDouble(),
      );
    }).toList();
    if (points.isEmpty) {
      throw Exception('Rota sem coordenadas validas.');
    }

    return MapRouteResult(
      points: points,
      distanceKm: ((route['distance'] as num?)?.toDouble() ?? 0) / 1000,
      durationMinutes: ((route['duration'] as num?)?.toDouble() ?? 0) / 60,
    );
  }
}
