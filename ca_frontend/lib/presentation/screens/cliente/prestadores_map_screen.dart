import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../core/config/amauc_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../domain/entities/prestador.dart';
import '../../providers/providers.dart';
import '../../widgets/profile_avatar.dart';
import '../prestador/prestador_profile_screen.dart';

class PrestadoresMapScreen extends ConsumerStatefulWidget {
  const PrestadoresMapScreen({super.key});

  @override
  ConsumerState<PrestadoresMapScreen> createState() =>
      _PrestadoresMapScreenState();
}

class _PrestadoresMapScreenState extends ConsumerState<PrestadoresMapScreen> {
  GoogleMapController? _mapController;
  LatLng _centro = const LatLng(
    AmaucConstants.defaultLat,
    AmaucConstants.defaultLng,
  );

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance
        .addPostFrameCallback((_) => _carregarLocalizacaoCliente());
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }

  Future<void> _carregarLocalizacaoCliente() async {
    final user = ref.read(authStateProvider).user;
    final cidade = user?.cidadeAmauc ?? 'Concórdia';
    final fallback = AmaucConstants.coordenadasCidade(cidade);
    final lat = user?.latitude ?? fallback.lat;
    final lng = user?.longitude ?? fallback.lng;

    _centro = LatLng(lat, lng);
    await ref
        .read(prestadoresProvider.notifier)
        .carregar(lat: lat, lng: lng, cidade: cidade);
    _animateTo(_centro);
  }

  Future<void> _carregarComGps() async {
    double? lat;
    double? lng;
    String? cidade = ref.read(authStateProvider).user?.cidadeAmauc;
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.always ||
          permission == LocationPermission.whileInUse) {
        final pos = await Geolocator.getCurrentPosition();
        lat = pos.latitude;
        lng = pos.longitude;
        _centro = LatLng(lat, lng);
      }
    } catch (_) {
      lat = null;
      lng = null;
    }

    await ref
        .read(prestadoresProvider.notifier)
        .carregar(lat: lat, lng: lng, cidade: cidade);
    _animateTo(_centro);
  }

  Set<Marker> _markers(List<Prestador> prestadores) {
    return prestadores
        .where((p) => p.latitude != null && p.longitude != null)
        .map(
          (p) => Marker(
            markerId: MarkerId('prestador-${p.id}'),
            position: LatLng(p.latitude!, p.longitude!),
            infoWindow: InfoWindow(
              title: p.nome,
              snippet: p.distanciaKm != null
                  ? '${p.cidade} - ${p.distanciaKm!.toStringAsFixed(1)} km'
                  : p.cidade,
            ),
            onTap: () => _openPrestador(p),
          ),
        )
        .toSet();
  }

  void _animateTo(LatLng target) {
    _mapController?.animateCamera(
      CameraUpdate.newCameraPosition(
        CameraPosition(target: target, zoom: 10.5),
      ),
    );
  }

  void _openPrestador(Prestador prestador) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PrestadorProfileScreen(prestador: prestador),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(prestadoresProvider);
    final markers = _markers(state.prestadores);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mapa de Prestadores'),
        actions: [
          IconButton(
            tooltip: 'Usar minha localização',
            onPressed: _carregarComGps,
            icon: const Icon(Icons.my_location_rounded),
          ),
        ],
      ),
      body: Stack(
        children: [
          if (kIsWeb)
            _WebMapFallback(
              centro: _centro,
              prestadores: state.prestadores,
              raioKm: state.raioKm,
              onTapPrestador: _openPrestador,
            )
          else
            GoogleMap(
              initialCameraPosition:
                  CameraPosition(target: _centro, zoom: 10.5),
              onMapCreated: (controller) => _mapController = controller,
              markers: markers,
              circles: {
                Circle(
                  circleId: const CircleId('raio-busca'),
                  center: LatLng(
                    state.lat ?? AmaucConstants.defaultLat,
                    state.lng ?? AmaucConstants.defaultLng,
                  ),
                  radius: state.raioKm * 1000,
                  fillColor: AppColors.primary.withValues(alpha: 0.08),
                  strokeColor: AppColors.primary.withValues(alpha: 0.45),
                  strokeWidth: 2,
                ),
              },
              myLocationButtonEnabled: false,
              myLocationEnabled: state.lat != null && state.lng != null,
              zoomControlsEnabled: false,
            ),
          Align(
            alignment: Alignment.bottomCenter,
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _RadiusPanel(state: state),
                    const SizedBox(height: 10),
                    SizedBox(
                      height: 118,
                      child: state.isLoading
                          ? const _MapLoading()
                          : ListView.separated(
                              scrollDirection: Axis.horizontal,
                              itemCount: state.prestadores.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(width: 10),
                              itemBuilder: (context, index) {
                                final prestador = state.prestadores[index];
                                return _MapPrestadorCard(
                                  prestador: prestador,
                                  onTap: () {
                                    if (prestador.latitude != null &&
                                        prestador.longitude != null) {
                                      _animateTo(
                                        LatLng(
                                          prestador.latitude!,
                                          prestador.longitude!,
                                        ),
                                      );
                                    }
                                    _openPrestador(prestador);
                                  },
                                );
                              },
                            ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RadiusPanel extends ConsumerWidget {
  const _RadiusPanel({required this.state});

  final PrestadoresState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
      decoration: BoxDecoration(
        color: AppColors.darkCard.withValues(alpha: 0.94),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.darkBorder),
      ),
      child: Column(
        children: [
          Row(
            children: [
              const Icon(Icons.radar_rounded, color: AppColors.primary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Raio de busca: ${state.raioKm.round()} km',
                  style: const TextStyle(
                    color: AppColors.textPrimaryDark,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              Text(
                '${state.prestadores.length} encontrados',
                style: const TextStyle(color: AppColors.muted, fontSize: 12),
              ),
            ],
          ),
          Slider(
            value: state.raioKm,
            min: 5,
            max: 80,
            divisions: 15,
            label: '${state.raioKm.round()} km',
            onChanged: (value) =>
                ref.read(prestadoresProvider.notifier).setRaio(value),
          ),
        ],
      ),
    );
  }
}

class _MapPrestadorCard extends StatelessWidget {
  const _MapPrestadorCard({
    required this.prestador,
    required this.onTap,
  });

  final Prestador prestador;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        width: 250,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.darkCard.withValues(alpha: 0.96),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.darkBorder),
        ),
        child: Row(
          children: [
            ProfileAvatar(
              name: prestador.nome,
              imageUrl: prestador.fotoUrl,
              radius: 24,
              isOnline: prestador.disponivel,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    prestador.nome,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.textPrimaryDark,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    prestador.categoria ?? prestador.cidade,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: AppColors.muted),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    prestador.distanciaKm != null
                        ? '${prestador.distanciaKm!.toStringAsFixed(1)} km de distancia'
                        : prestador.cidade,
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w800,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MapLoading extends StatelessWidget {
  const _MapLoading();

  @override
  Widget build(BuildContext context) {
    return Container(
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AppColors.darkCard.withValues(alpha: 0.94),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.darkBorder),
      ),
      child: const CircularProgressIndicator(color: AppColors.primary),
    );
  }
}

class _WebMapFallback extends StatelessWidget {
  const _WebMapFallback({
    required this.centro,
    required this.prestadores,
    required this.raioKm,
    required this.onTapPrestador,
  });

  final LatLng centro;
  final List<Prestador> prestadores;
  final double raioKm;
  final ValueChanged<Prestador> onTapPrestador;

  @override
  Widget build(BuildContext context) {
    final prestadoresComCoordenadas = prestadores
        .where((p) => p.latitude != null && p.longitude != null)
        .toList();

    return Container(
      color: AppColors.darkBackground,
      child: LayoutBuilder(
        builder: (context, constraints) {
          return Stack(
            children: [
              Positioned.fill(
                child: CustomPaint(
                  painter: _AmaUcMapPainter(raioKm: raioKm),
                ),
              ),
              Positioned(
                left: 18,
                right: 18,
                top: 22,
                child: _WebMapNotice(
                  count: prestadoresComCoordenadas.length,
                ),
              ),
              for (final prestador in prestadoresComCoordenadas)
                _WebMapMarker(
                  prestador: prestador,
                  position: _positionFor(
                    prestador,
                    constraints.biggest,
                  ),
                  onTap: () => onTapPrestador(prestador),
                ),
              _WebMapCenterPin(
                position: Offset(
                  constraints.maxWidth / 2,
                  constraints.maxHeight / 2,
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Offset _positionFor(Prestador prestador, Size size) {
    const latSpan = 0.85;
    const lngSpan = 1.1;
    final dx = ((prestador.longitude! - centro.longitude) / lngSpan) *
        size.width *
        0.72;
    final dy = -((prestador.latitude! - centro.latitude) / latSpan) *
        size.height *
        0.64;

    final x = (size.width / 2 + dx).clamp(28.0, size.width - 28.0);
    final y = (size.height / 2 + dy).clamp(100.0, size.height - 170.0);
    return Offset(x, y);
  }
}

class _WebMapNotice extends StatelessWidget {
  const _WebMapNotice({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.darkCard.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.darkBorder),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            const Icon(Icons.map_outlined, color: AppColors.primary),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                'Mapa web simplificado',
                style: TextStyle(
                  color: AppColors.textPrimaryDark,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            Text(
              '$count no mapa',
              style: const TextStyle(color: AppColors.muted, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}

class _WebMapMarker extends StatelessWidget {
  const _WebMapMarker({
    required this.prestador,
    required this.position,
    required this.onTap,
  });

  final Prestador prestador;
  final Offset position;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: position.dx - 18,
      top: position.dy - 18,
      child: Tooltip(
        message: prestador.nome,
        child: InkWell(
          onTap: onTap,
          customBorder: const CircleBorder(),
          child: Container(
            width: 36,
            height: 36,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.darkCard,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.primary, width: 2),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.25),
                  blurRadius: 16,
                ),
              ],
            ),
            child: Text(
              _initials(prestador.nome),
              style: const TextStyle(
                color: AppColors.primary,
                fontSize: 11,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts.first.isEmpty) return 'P';
    final first = parts.first[0];
    final second = parts.length > 1 && parts[1].isNotEmpty ? parts[1][0] : '';
    return '$first$second'.toUpperCase();
  }
}

class _WebMapCenterPin extends StatelessWidget {
  const _WebMapCenterPin({required this.position});

  final Offset position;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: position.dx - 7,
      top: position.dy - 7,
      child: Container(
        width: 14,
        height: 14,
        decoration: BoxDecoration(
          color: AppColors.accent,
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.darkBackground, width: 2),
        ),
      ),
    );
  }
}

class _AmaUcMapPainter extends CustomPainter {
  const _AmaUcMapPainter({required this.raioKm});

  final double raioKm;

  @override
  void paint(Canvas canvas, Size size) {
    final bgPaint = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0xFF07111F), Color(0xFF102238)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ).createShader(Offset.zero & size);
    canvas.drawRect(Offset.zero & size, bgPaint);

    final gridPaint = Paint()
      ..color = AppColors.darkBorder.withValues(alpha: 0.26)
      ..strokeWidth = 1;
    for (var x = 0.0; x < size.width; x += 36) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), gridPaint);
    }
    for (var y = 0.0; y < size.height; y += 36) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    final center = Offset(size.width / 2, size.height / 2);
    final radius = (raioKm / 80).clamp(0.15, 1.0) * size.shortestSide * 0.38;
    final radiusPaint = Paint()
      ..color = AppColors.primary.withValues(alpha: 0.08)
      ..style = PaintingStyle.fill;
    final radiusStroke = Paint()
      ..color = AppColors.primary.withValues(alpha: 0.35)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    canvas.drawCircle(center, radius, radiusPaint);
    canvas.drawCircle(center, radius, radiusStroke);

    final routePaint = Paint()
      ..color = AppColors.muted.withValues(alpha: 0.28)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    final path = Path()
      ..moveTo(size.width * 0.08, size.height * 0.46)
      ..cubicTo(
        size.width * 0.25,
        size.height * 0.34,
        size.width * 0.44,
        size.height * 0.58,
        size.width * 0.64,
        size.height * 0.42,
      )
      ..cubicTo(
        size.width * 0.76,
        size.height * 0.32,
        size.width * 0.85,
        size.height * 0.55,
        size.width * 0.96,
        size.height * 0.47,
      );
    canvas.drawPath(path, routePaint);
  }

  @override
  bool shouldRepaint(covariant _AmaUcMapPainter oldDelegate) {
    return oldDelegate.raioKm != raioKm;
  }
}
