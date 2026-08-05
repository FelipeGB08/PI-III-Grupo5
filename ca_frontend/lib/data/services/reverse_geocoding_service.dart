import 'package:dio/dio.dart';

class ReverseGeocodedAddress {
  const ReverseGeocodedAddress({
    required this.endereco,
    this.cidade,
    this.bairro,
    this.estado,
    this.cep,
  });

  final String endereco;
  final String? cidade;
  final String? bairro;
  final String? estado;
  final String? cep;

  String get descricaoCompleta => [
        endereco,
        if (bairro?.isNotEmpty == true) bairro,
        if (cidade?.isNotEmpty == true) cidade,
        if (estado?.isNotEmpty == true) estado,
        if (cep?.isNotEmpty == true) 'CEP $cep',
      ].join(', ');
}

/// Resolve um endereço a partir do GPS sem exigir chave de provedor.
///
/// A falha desse serviço é intencionalmente recuperável: o aplicativo mantém
/// as coordenadas e deixa o preenchimento manual disponível.
class ReverseGeocodingService {
  ReverseGeocodingService({Dio? dio})
      : _dio = dio ??
            Dio(
              BaseOptions(
                baseUrl: 'https://nominatim.openstreetmap.org',
                connectTimeout: const Duration(seconds: 8),
                receiveTimeout: const Duration(seconds: 8),
                headers: const {
                  'Accept-Language': 'pt-BR,pt;q=0.9',
                  'User-Agent': 'ConectaAMAUC/1.0',
                },
              ),
            );

  final Dio _dio;

  Future<ReverseGeocodedAddress?> buscar({
    required double latitude,
    required double longitude,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/reverse',
        queryParameters: {
          'format': 'jsonv2',
          'lat': latitude,
          'lon': longitude,
          'addressdetails': 1,
        },
      );
      final data = response.data;
      if (data == null) return null;
      final address = data['address'];
      if (address is! Map) return null;

      String? valueOf(List<String> keys) {
        for (final key in keys) {
          final value = address[key]?.toString().trim();
          if (value?.isNotEmpty == true) return value;
        }
        return null;
      }

      final rua = valueOf(['road', 'pedestrian', 'residential']);
      final numero = valueOf(['house_number']);
      final endereco = [
        if (rua?.isNotEmpty == true) rua,
        if (numero?.isNotEmpty == true) numero,
      ].join(', ');

      return ReverseGeocodedAddress(
        endereco: endereco.isNotEmpty
            ? endereco
            : (data['display_name']?.toString().trim() ?? ''),
        bairro: valueOf(['suburb', 'neighbourhood', 'quarter']),
        cidade: valueOf(['city', 'town', 'village', 'municipality']),
        estado: valueOf(['state']),
        cep: valueOf(['postcode']),
      );
    } on DioException {
      return null;
    }
  }
}
