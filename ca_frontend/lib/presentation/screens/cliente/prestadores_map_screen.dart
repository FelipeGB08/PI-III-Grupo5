import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/config/amauc_constants.dart';
import '../../../core/theme/adaptive_colors.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/services/map_route_service.dart';
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
  final _mapController = MapController();
  LatLng _centro = const LatLng(
    AmaucConstants.defaultLat,
    AmaucConstants.defaultLng,
  );
  bool _capturandoGps = false;
  bool _calculandoRota = false;
  Prestador? _prestadorSelecionado;
  MapRouteResult? _rota;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance
        .addPostFrameCallback((_) => _carregarLocalizacaoCliente());
  }

  Future<void> _carregarLocalizacaoCliente() async {
    final user = ref.read(authStateProvider).user;
    final cidade = user?.cidadeAmauc ?? 'Concórdia';
    final fallback = AmaucConstants.coordenadasCidade(cidade);
    final lat = user?.latitude ?? fallback.lat;
    final lng = user?.longitude ?? fallback.lng;

    setState(() => _centro = LatLng(lat, lng));
    await ref
        .read(prestadoresProvider.notifier)
        .carregar(lat: lat, lng: lng, cidade: cidade);
    _animateTo(_centro);
  }

  Future<void> _carregarComGps() async {
    if (_capturandoGps) return;

    setState(() => _capturandoGps = true);
    double? lat;
    double? lng;
    final cidade = ref.read(authStateProvider).user?.cidadeAmauc;

    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        _showSnack('Ative a localização do dispositivo para usar o mapa.');
        return;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        _showSnack('Permita a localização para buscar prestadores próximos.');
        return;
      }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );
      lat = pos.latitude;
      lng = pos.longitude;
      setState(() => _centro = LatLng(lat!, lng!));
      _showSnack('Mapa atualizado com sua localização atual.');
    } catch (_) {
      _showSnack('Não foi possível capturar sua localização agora.');
    } finally {
      if (mounted) setState(() => _capturandoGps = false);
    }

    await ref
        .read(prestadoresProvider.notifier)
        .carregar(lat: lat, lng: lng, cidade: cidade);
    _animateTo(_centro);
  }

  List<Marker> _markers(List<Prestador> prestadores) {
    final markers = <Marker>[
      Marker(
        point: _centro,
        width: 46,
        height: 46,
        child: const _ClienteMarker(),
      ),
    ];

    markers.addAll(
      prestadores.where((p) => p.latitude != null && p.longitude != null).map(
            (p) => Marker(
              point: LatLng(p.latitude!, p.longitude!),
              width: 54,
              height: 54,
              child: _PrestadorMapMarker(
                prestador: p,
                selected: _prestadorSelecionado?.id == p.id,
                onTap: () => _selecionarPrestador(p),
              ),
            ),
          ),
    );

    return markers;
  }

  void _animateTo(LatLng target) {
    _mapController.move(target, 11);
  }

  Future<void> _selecionarPrestador(Prestador prestador) async {
    if (prestador.latitude == null || prestador.longitude == null) {
      _showSnack('Este prestador ainda nao possui localizacao no mapa.');
      return;
    }

    final destino = LatLng(prestador.latitude!, prestador.longitude!);
    final meio = LatLng(
      (_centro.latitude + destino.latitude) / 2,
      (_centro.longitude + destino.longitude) / 2,
    );

    setState(() {
      _prestadorSelecionado = prestador;
      _rota = null;
      _calculandoRota = true;
    });
    _mapController.move(meio, 12);

    try {
      final rota = await ref.read(mapRouteServiceProvider).drivingRoute(
            origin: _centro,
            destination: destino,
          );
      if (!mounted) return;
      setState(() => _rota = rota);
    } catch (_) {
      if (!mounted) return;
      _showSnack(
        'Nao foi possivel calcular a rota agora. Distancia em linha reta exibida.',
      );
    } finally {
      if (mounted) setState(() => _calculandoRota = false);
    }
  }

  void _openPrestador(Prestador prestador) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PrestadorProfileScreen(prestador: prestador),
      ),
    );
  }

  Future<void> _copiarLinkRota() async {
    final prestador = _prestadorSelecionado;
    if (prestador?.latitude == null || prestador?.longitude == null) return;

    final url =
        'https://www.google.com/maps/dir/?api=1&origin=${_centro.latitude},${_centro.longitude}&destination=${prestador!.latitude},${prestador.longitude}&travelmode=driving';
    await Clipboard.setData(ClipboardData(text: url));
    _showSnack('Link da rota copiado. Cole no navegador ou Google Maps.');
  }

  void _showSnack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(prestadoresProvider);
    final markers = _markers(state.prestadores);
    final rota = _rota;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mapa de Prestadores'),
        actions: [
          IconButton(
            tooltip: 'Usar minha localização',
            onPressed: _capturandoGps ? null : _carregarComGps,
            icon: _capturandoGps
                ? const SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.my_location_rounded),
          ),
        ],
      ),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _centro,
              initialZoom: 11,
              minZoom: 8,
              maxZoom: 18,
              interactionOptions: const InteractionOptions(
                flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
              ),
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'br.edu.ifc.conecta_amauc',
                maxZoom: 19,
              ),
              SimpleAttributionWidget(
                source: const Text('OpenStreetMap contributors'),
                alignment: Alignment.topRight,
                backgroundColor: context.appCard.withValues(alpha: 0.88),
              ),
              CircleLayer(
                circles: [
                  CircleMarker(
                    point: _centro,
                    radius: state.raioKm * 1000,
                    useRadiusInMeter: true,
                    color: AppColors.primary.withValues(alpha: 0.10),
                    borderColor: AppColors.primary.withValues(alpha: 0.45),
                    borderStrokeWidth: 2,
                  ),
                ],
              ),
              if (rota != null && rota.points.length > 1)
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: rota.points,
                      color: AppColors.primary,
                      strokeWidth: 5,
                    ),
                  ],
                ),
              MarkerLayer(markers: markers),
            ],
          ),
          if (state.erro != null)
            Positioned(
              left: 12,
              right: 12,
              top: 12,
              child: _MapError(message: state.erro!),
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
                    _RadiusPanel(state: state, centro: _centro),
                    if (_prestadorSelecionado != null) ...[
                      const SizedBox(height: 10),
                      _RoutePanel(
                        prestador: _prestadorSelecionado!,
                        rota: _rota,
                        isLoading: _calculandoRota,
                        onOpenProfile: () =>
                            _openPrestador(_prestadorSelecionado!),
                        onCopyRoute: _copiarLinkRota,
                      ),
                    ],
                    const SizedBox(height: 10),
                    SizedBox(
                      height: 118,
                      child: state.isLoading
                          ? const _MapLoading()
                          : state.prestadores.isEmpty
                              ? const _EmptyMapResults()
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
                                        _selecionarPrestador(prestador);
                                      },
                                      selected: _prestadorSelecionado?.id ==
                                          prestador.id,
                                      onOpenProfile: () =>
                                          _openPrestador(prestador),
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
  const _RadiusPanel({required this.state, required this.centro});

  final PrestadoresState state;
  final LatLng centro;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
      decoration: BoxDecoration(
        color: context.appCard.withValues(alpha: 0.96),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: context.appBorder),
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
                  style: TextStyle(
                    color: context.appTextPrimary,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              Text(
                '${state.prestadores.length} encontrados',
                style: TextStyle(color: context.appMuted, fontSize: 12),
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
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'Centro: ${centro.latitude.toStringAsFixed(5)}, ${centro.longitude.toStringAsFixed(5)}',
              style: TextStyle(color: context.appMuted, fontSize: 11),
            ),
          ),
          const SizedBox(height: 4),
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'Os prestadores aparecem no centro aproximado do municipio; '
              'o endereco pessoal nao e publicado.',
              style: TextStyle(fontSize: 11),
            ),
          ),
        ],
      ),
    );
  }
}

class _PrestadorMapMarker extends StatelessWidget {
  const _PrestadorMapMarker({
    required this.prestador,
    required this.selected,
    required this.onTap,
  });

  final Prestador prestador;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: prestador.nome,
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: Container(
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: context.appCard,
            shape: BoxShape.circle,
            border: Border.all(
              color: selected ? AppColors.accent : AppColors.primary,
              width: selected ? 3 : 2,
            ),
            boxShadow: [
              BoxShadow(
                color: (selected ? AppColors.accent : AppColors.primary)
                    .withValues(alpha: 0.32),
                blurRadius: selected ? 24 : 18,
              ),
            ],
          ),
          child: Text(
            _initials(prestador.nome),
            style: const TextStyle(
              color: AppColors.primary,
              fontSize: 12,
              fontWeight: FontWeight.w900,
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

class _ClienteMarker extends StatelessWidget {
  const _ClienteMarker();

  @override
  Widget build(BuildContext context) {
    return Container(
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AppColors.accent,
        shape: BoxShape.circle,
        border: Border.all(color: context.appBackground, width: 3),
        boxShadow: [
          BoxShadow(
            color: AppColors.accent.withValues(alpha: 0.32),
            blurRadius: 18,
          ),
        ],
      ),
      child: const Icon(
        Icons.person_pin_circle_rounded,
        color: Colors.white,
        size: 24,
      ),
    );
  }
}

class _MapPrestadorCard extends StatelessWidget {
  const _MapPrestadorCard({
    required this.prestador,
    required this.selected,
    required this.onTap,
    required this.onOpenProfile,
  });

  final Prestador prestador;
  final bool selected;
  final VoidCallback onTap;
  final VoidCallback onOpenProfile;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        width: 250,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: context.appCard.withValues(alpha: 0.96),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: selected ? AppColors.primary : context.appBorder,
            width: selected ? 1.6 : 1,
          ),
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
                    style: TextStyle(
                      color: context.appTextPrimary,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    prestador.categoria ?? prestador.cidade,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: context.appMuted),
                  ),
                  const SizedBox(height: 7),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          prestador.distanciaKm != null
                              ? '${prestador.distanciaKm!.toStringAsFixed(1)} km em linha reta'
                              : prestador.cidade,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w800,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: onOpenProfile,
                        style: TextButton.styleFrom(
                          visualDensity: VisualDensity.compact,
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                        ),
                        child: const Text('Perfil'),
                      ),
                    ],
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

class _RoutePanel extends StatelessWidget {
  const _RoutePanel({
    required this.prestador,
    required this.rota,
    required this.isLoading,
    required this.onOpenProfile,
    required this.onCopyRoute,
  });

  final Prestador prestador;
  final MapRouteResult? rota;
  final bool isLoading;
  final VoidCallback onOpenProfile;
  final VoidCallback onCopyRoute;

  @override
  Widget build(BuildContext context) {
    final routeText = isLoading
        ? 'Calculando rota...'
        : rota != null
            ? '${rota!.distanceKm.toStringAsFixed(1)} km por rota - ${rota!.durationMinutes.round()} min'
            : prestador.distanciaKm != null
                ? '${prestador.distanciaKm!.toStringAsFixed(1)} km em linha reta'
                : 'Rota indisponivel';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: context.appCard.withValues(alpha: 0.96),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.35)),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(14),
            ),
            child: isLoading
                ? const Padding(
                    padding: EdgeInsets.all(10),
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.route_rounded, color: AppColors.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  prestador.nome,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: context.appTextPrimary,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  routeText,
                  style: TextStyle(
                    color: context.appTextSecondary,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (prestador.localizacaoAproximada) ...[
                  const SizedBox(height: 2),
                  Text(
                    'Destino aproximado pelo municipio',
                    style: TextStyle(
                      color: context.appMuted,
                      fontSize: 11,
                    ),
                  ),
                ],
              ],
            ),
          ),
          IconButton(
            tooltip: 'Copiar rota',
            onPressed: isLoading ? null : onCopyRoute,
            icon: const Icon(Icons.directions_rounded),
          ),
          IconButton(
            tooltip: 'Ver perfil',
            onPressed: onOpenProfile,
            icon: const Icon(Icons.person_rounded),
          ),
        ],
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
        color: context.appCard.withValues(alpha: 0.96),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: context.appBorder),
      ),
      child: const CircularProgressIndicator(color: AppColors.primary),
    );
  }
}

class _EmptyMapResults extends StatelessWidget {
  const _EmptyMapResults();

  @override
  Widget build(BuildContext context) {
    return Container(
      alignment: Alignment.center,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.appCard.withValues(alpha: 0.96),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: context.appBorder),
      ),
      child: Text(
        'Nenhum prestador com localização encontrada neste raio.',
        textAlign: TextAlign.center,
        style: TextStyle(color: context.appMuted),
      ),
    );
  }
}

class _MapError extends StatelessWidget {
  const _MapError({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.statusRecusado.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Text(
          message,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}
