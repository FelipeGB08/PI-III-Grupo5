import 'dart:io';

import 'package:dio/dio.dart';

import '../core/config/api_config.dart';
import '../core/network/dio_client.dart';
import '../data/models/chamado_model.dart';
import '../domain/entities/chamado.dart';

/// Serviço HTTP de orçamentos/serviços solicitados (POST com upload Multer).
class ServicosService {
  ServicosService(this._dio);

  final Dio _dio;

  Future<ChamadoModel> solicitarOrcamento({
    required int profId,
    required String descricao,
    File? foto,
  }) async {
    try {
      final formData = FormData.fromMap({
        'prof_id': profId,
        'descricao': descricao,
        if (foto != null)
          'foto': await MultipartFile.fromFile(
            foto.path,
            filename: foto.path.split(Platform.pathSeparator).last,
          ),
      });

      final response = await _dio.post(
        ApiConfig.servicos,
        data: formData,
        options: Options(contentType: 'multipart/form-data'),
      );

      final data = response.data as Map<String, dynamic>;
      final payload = (data['servico'] ?? data['solicitacao'] ?? data)
          as Map<String, dynamic>;
      return ChamadoModel.fromJson(payload);
    } on DioException catch (e) {
      throw DioClient.unwrapError(e);
    }
  }

  Future<ChamadoModel> atualizarStatus({
    required int servicoId,
    required ChamadoStatus status,
    double? preco,
  }) async {
    try {
      final response = await _dio.put(
        ApiConfig.servicoStatus(servicoId),
        data: {
          'status': _statusApi(status),
          if (preco != null) 'preco': preco,
        },
      );

      final data = response.data as Map<String, dynamic>;
      final payload = (data['servico'] ?? data['solicitacao'] ?? data)
          as Map<String, dynamic>;
      return ChamadoModel.fromJson(payload);
    } on DioException catch (e) {
      throw DioClient.unwrapError(e);
    }
  }

  Future<List<ChamadoModel>> listarComoCliente({String? status}) async {
    try {
      final response = await _dio.get(
        ApiConfig.chamadosCliente,
        queryParameters: {if (status != null) 'status': status},
      );
      return (response.data as List<dynamic>)
          .map((e) => ChamadoModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw DioClient.unwrapError(e);
    }
  }

  Future<List<ChamadoModel>> listarComoProfissional({String? status}) async {
    try {
      final response = await _dio.get(
        ApiConfig.chamadosMeus,
        queryParameters: {if (status != null) 'status': status},
      );
      return (response.data as List<dynamic>)
          .map((e) => ChamadoModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw DioClient.unwrapError(e);
    }
  }

  String _statusApi(ChamadoStatus status) => switch (status) {
        ChamadoStatus.pendente => 'pendente',
        ChamadoStatus.emAndamento => 'aceito',
        ChamadoStatus.concluido => 'concluido',
        ChamadoStatus.recusado => 'recusado',
      };
}
