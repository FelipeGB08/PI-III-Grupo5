import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/config/api_config.dart';
import '../../../core/network/api_error_formatter.dart';
import '../../../core/theme/app_colors.dart';
import '../../../domain/entities/user.dart';
import '../../providers/providers.dart';

class MinhaContaScreen extends ConsumerStatefulWidget {
  const MinhaContaScreen({super.key});

  @override
  ConsumerState<MinhaContaScreen> createState() => _MinhaContaScreenState();
}

class _MinhaContaScreenState extends ConsumerState<MinhaContaScreen> {
  final _nomeController = TextEditingController();
  final _telefoneController = TextEditingController();
  final _picker = ImagePicker();

  bool _salvando = false;
  bool _carregandoPerfil = true;
  File? _fotoLocal;
  String? _fotoUrlRemota;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _carregarPerfil());
  }

  @override
  void dispose() {
    _nomeController.dispose();
    _telefoneController.dispose();
    super.dispose();
  }

  Future<void> _carregarPerfil() async {
    final user = ref.read(authStateProvider).user;
    if (user != null) {
      _preencherCampos(user);
    }

    final atualizado = await ref.read(authStateProvider.notifier).refreshProfile();
    if (!mounted) return;

    setState(() {
      _carregandoPerfil = false;
      if (atualizado != null) {
        _preencherCampos(atualizado);
      }
    });
  }

  void _preencherCampos(User user) {
    _nomeController.text = user.nome;
    _telefoneController.text = user.telefone ?? '';
    _fotoUrlRemota = user.fotoUrl;
  }

  Future<void> _trocarFoto() async {
    final imagem = await _picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1024,
      imageQuality: 85,
    );
    if (imagem != null && mounted) {
      setState(() => _fotoLocal = File(imagem.path));
    }
  }

  Future<void> _salvar() async {
    final nome = _nomeController.text.trim();
    if (nome.length < 2) {
      _mostrarErro('Informe um nome válido.');
      return;
    }

    setState(() => _salvando = true);

    String? fotoUrl = _fotoUrlRemota;
    if (_fotoLocal != null) {
      fotoUrl = await ref.read(authStateProvider.notifier).uploadAvatar(
            _fotoLocal!.path,
          );
      if (fotoUrl == null || fotoUrl.isEmpty) {
        if (mounted) {
          setState(() => _salvando = false);
          _mostrarErro(ref.read(authStateProvider).error ?? 'Falha ao enviar foto.');
        }
        return;
      }
    }

    final ok = await ref.read(authStateProvider.notifier).updateProfile(
          nome: nome,
          telefone: _telefoneController.text.trim(),
          fotoUrl: fotoUrl,
        );

    if (!mounted) return;

    setState(() {
      _salvando = false;
      if (ok) {
        _fotoLocal = null;
        _fotoUrlRemota = ref.read(authStateProvider).user?.fotoUrl;
      }
    });

    if (ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Perfil atualizado com sucesso!')),
      );
    } else {
      _mostrarErro(ref.read(authStateProvider).error ?? 'Não foi possível salvar.');
    }
  }

  void _mostrarErro(String mensagem) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(formatApiError(mensagem))),
    );
  }

  Future<void> _sair() async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sair da conta'),
        content: const Text('Deseja encerrar sua sessão neste dispositivo?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Sair')),
        ],
      ),
    );

    if (confirmar == true) {
      await ref.read(authStateProvider.notifier).logout();
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authStateProvider).user;
    final theme = Theme.of(context);

    if (_carregandoPerfil && user == null) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primary));
    }

    ImageProvider? fotoExibicao;
    if (_fotoLocal != null) {
      fotoExibicao = FileImage(_fotoLocal!);
    } else if (_fotoUrlRemota != null && _fotoUrlRemota!.isNotEmpty) {
      fotoExibicao = CachedNetworkImageProvider(
        ApiConfig.resolveAssetUrl(_fotoUrlRemota),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Minha Conta',
            style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w900),
          ).animate().fadeIn().slideY(begin: 0.1),
          const SizedBox(height: 8),
          Text(
            'Gerencie seus dados e foto de perfil.',
            style: theme.textTheme.bodyMedium?.copyWith(color: AppColors.muted),
          ),
          const SizedBox(height: 28),
          Center(
            child: Stack(
              children: [
                CircleAvatar(
                  radius: 52,
                  backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                  backgroundImage: fotoExibicao,
                  child: fotoExibicao == null
                      ? Text(
                          user?.nome.isNotEmpty == true ? user!.nome[0].toUpperCase() : '?',
                          style: const TextStyle(
                            fontSize: 36,
                            fontWeight: FontWeight.w900,
                            color: AppColors.primary,
                          ),
                        )
                      : null,
                ),
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: Material(
                    color: AppColors.primary,
                    shape: const CircleBorder(),
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: _salvando ? null : _trocarFoto,
                      child: const Padding(
                        padding: EdgeInsets.all(10),
                        child: Icon(Icons.camera_alt_rounded, color: Colors.white, size: 20),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Center(
            child: Text(
              user?.tipo.isPrestador == true ? 'Prestador AMAUC' : 'Cidadão AMAUC',
              style: theme.textTheme.labelLarge?.copyWith(color: AppColors.primary),
            ),
          ),
          const SizedBox(height: 28),
          TextField(
            controller: _nomeController,
            decoration: const InputDecoration(
              labelText: 'Nome completo',
              prefixIcon: Icon(Icons.person_outline_rounded),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _telefoneController,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Telefone',
              prefixIcon: Icon(Icons.phone_outlined),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            enabled: false,
            controller: TextEditingController(text: user?.email ?? ''),
            decoration: const InputDecoration(
              labelText: 'E-mail',
              prefixIcon: Icon(Icons.email_outlined),
            ),
          ),
          if (user?.cidadeAmauc != null && user!.cidadeAmauc!.isNotEmpty) ...[
            const SizedBox(height: 16),
            TextField(
              enabled: false,
              controller: TextEditingController(text: user.cidadeAmauc),
              decoration: const InputDecoration(
                labelText: 'Cidade AMAUC',
                prefixIcon: Icon(Icons.location_city_outlined),
              ),
            ),
          ],
          const SizedBox(height: 28),
          FilledButton(
            onPressed: _salvando ? null : _salvar,
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
            ),
            child: _salvando
                ? const SizedBox(
                    height: 22,
                    width: 22,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Text('Salvar alterações', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: _sair,
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Sair da conta'),
          ),
        ],
      ),
    );
  }
}
