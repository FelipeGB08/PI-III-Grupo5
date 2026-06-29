import 'package:flutter/material.dart';

/// Municípios associados à AMAUC (Alto Uruguai Catarinense).
class AmaucConstants {
  AmaucConstants._();

  static const List<String> cidades = [
    'Arabutã',
    'Arvoredo',
    'Concórdia',
    'Ipira',
    'Ipumirim',
    'Irani',
    'Itá',
    'Lindóia do Sul',
    'Paial',
    'Peritiba',
    'Piratuba',
    'Presidente Castello Branco',
    'Seara',
    'Xavantina',
  ];

  static const List<ServicoCategoria> categorias = [
    ServicoCategoria(
      id: 'hidraulica',
      nome: 'Hidráulica',
      icon: Icons.plumbing_rounded,
      cor: Color(0xFF3B82F6),
    ),
    ServicoCategoria(
      id: 'eletrica',
      nome: 'Elétrica',
      icon: Icons.electrical_services_rounded,
      cor: Color(0xFFF59E0B),
    ),
    ServicoCategoria(
      id: 'eletricista_rural',
      nome: 'Eletricista Rural',
      icon: Icons.electrical_services_outlined,
      cor: Color(0xFF22D3EE),
    ),
    ServicoCategoria(
      id: 'manutencao_rural',
      nome: 'Manutenção Rural',
      icon: Icons.agriculture_rounded,
      cor: Color(0xFF84CC16),
    ),
    ServicoCategoria(
      id: 'mecanica_agricola',
      nome: 'Mecânica Agrícola',
      icon: Icons.precision_manufacturing_rounded,
      cor: Color(0xFF14B8A6),
    ),
    ServicoCategoria(
      id: 'fretes_carretos',
      nome: 'Fretes e Carretos',
      icon: Icons.local_shipping_rounded,
      cor: Color(0xFFF97316),
    ),
    ServicoCategoria(
      id: 'ti',
      nome: 'TI',
      icon: Icons.computer_rounded,
      cor: Color(0xFF8B5CF6),
    ),
    ServicoCategoria(
      id: 'limpeza',
      nome: 'Limpeza',
      icon: Icons.cleaning_services_rounded,
      cor: Color(0xFF10B981),
    ),
    ServicoCategoria(
      id: 'limpeza_pos_obra',
      nome: 'Limpeza Pós-Obra',
      icon: Icons.clean_hands_rounded,
      cor: Color(0xFF06B6D4),
    ),
    ServicoCategoria(
      id: 'refrigeracao',
      nome: 'Refrigeração',
      icon: Icons.ac_unit_rounded,
      cor: Color(0xFF38BDF8),
    ),
    ServicoCategoria(
      id: 'construcao',
      nome: 'Construção',
      icon: Icons.construction_rounded,
      cor: Color(0xFFEF4444),
    ),
  ];

  /// Coordenadas de Concórdia (sede AMAUC) quando GPS indisponível.
  static const double defaultLat = -27.2342;
  static const double defaultLng = -52.0277;

  static const Map<String, ({double lat, double lng})> coordenadasPorCidade = {
    'Arabutã': (lat: -27.1583, lng: -52.1428),
    'Arvoredo': (lat: -27.0747, lng: -52.4542),
    'Concórdia': (lat: -27.2342, lng: -52.0277),
    'Ipira': (lat: -27.4039, lng: -51.7758),
    'Ipumirim': (lat: -27.0778, lng: -52.1356),
    'Irani': (lat: -27.0242, lng: -51.9017),
    'Itá': (lat: -27.2906, lng: -52.3219),
    'Lindóia do Sul': (lat: -27.0542, lng: -52.0692),
    'Paial': (lat: -27.2542, lng: -52.4972),
    'Peritiba': (lat: -27.3753, lng: -51.9017),
    'Piratuba': (lat: -27.4192, lng: -51.7719),
    'Presidente Castello Branco': (lat: -27.2247, lng: -51.8078),
    'Seara': (lat: -27.1564, lng: -52.2992),
    'Xavantina': (lat: -27.0661, lng: -52.3433),
  };

  static ({double lat, double lng}) coordenadasCidade(String? cidade) {
    return coordenadasPorCidade[cidade] ?? (lat: defaultLat, lng: defaultLng);
  }

  static String? categoriaNomePorId(String? id) {
    if (id == null) return null;
    for (final c in categorias) {
      if (c.id == id) return c.nome;
    }
    return id;
  }
}

class ServicoCategoria {
  const ServicoCategoria({
    required this.id,
    required this.nome,
    required this.icon,
    required this.cor,
  });

  final String id;
  final String nome;
  final IconData icon;
  final Color cor;
}
