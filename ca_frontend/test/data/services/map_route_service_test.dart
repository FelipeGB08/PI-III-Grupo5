import 'dart:convert';
import 'dart:typed_data';

import 'package:ca_frontend/data/services/map_route_service.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';

class _StubAdapter implements HttpClientAdapter {
  _StubAdapter(this.handler);

  final Future<ResponseBody> Function(RequestOptions options) handler;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) =>
      handler(options);

  @override
  void close({bool force = false}) {}
}

void main() {
  test('calcula rota OSRM usando longitude antes da latitude', () async {
    Uri? requestedUri;
    final dio = Dio()
      ..httpClientAdapter = _StubAdapter((options) async {
        requestedUri = options.uri;
        return ResponseBody.fromString(
          jsonEncode({
            'code': 'Ok',
            'routes': [
              {
                'distance': 9620,
                'duration': 900,
                'geometry': {
                  'coordinates': [
                    [-52.0277, -27.2342],
                    [-51.9017, -27.0242],
                  ],
                },
              },
            ],
          }),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

    final result = await MapRouteService(
      dio: dio,
      baseUrl: 'https://rotas.example.test/',
    ).drivingRoute(
      origin: const LatLng(-27.2342, -52.0277),
      destination: const LatLng(-27.0242, -51.9017),
    );

    expect(
      requestedUri?.path,
      '/route/v1/driving/-52.0277,-27.2342;-51.9017,-27.0242',
    );
    expect(requestedUri?.queryParameters['geometries'], 'geojson');
    expect(result.distanceKm, 9.62);
    expect(result.durationMinutes, 15);
    expect(result.points, const [
      LatLng(-27.2342, -52.0277),
      LatLng(-27.0242, -51.9017),
    ]);
  });

  test('rejeita resposta de rota sem coordenadas validas', () async {
    final dio = Dio()
      ..httpClientAdapter = _StubAdapter((options) async {
        return ResponseBody.fromString(
          jsonEncode({
            'routes': [
              {
                'distance': 100,
                'duration': 30,
                'geometry': {
                  'coordinates': [
                    ['invalida'],
                  ],
                },
              },
            ],
          }),
          200,
          headers: {
            Headers.contentTypeHeader: [Headers.jsonContentType],
          },
        );
      });

    expect(
      () => MapRouteService(dio: dio).drivingRoute(
        origin: const LatLng(-27.2342, -52.0277),
        destination: const LatLng(-27.0242, -51.9017),
      ),
      throwsA(isA<Exception>()),
    );
  });
}
