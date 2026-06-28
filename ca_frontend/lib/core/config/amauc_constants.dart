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
