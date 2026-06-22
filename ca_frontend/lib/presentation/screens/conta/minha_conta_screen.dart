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
  bool _notificacoes = true;
  bool _altoContraste = true;
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

    final atualizado =
        await ref.read(authStateProvider.notifier).refreshProfile();
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
          _mostrarErro(
              ref.read(authStateProvider).error ?? 'Falha ao enviar foto.');
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
      _mostrarErro(
          ref.read(authStateProvider).error ?? 'Não foi possível salvar.');
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
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancelar')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Sair')),
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
      return const Center(
          child: CircularProgressIndicator(color: AppColors.primary));
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
            'Perfil',
            style: theme.textTheme.headlineMedium
                ?.copyWith(fontWeight: FontWeight.w900),
          ).animate().fadeIn().slideY(begin: 0.1),
          const SizedBox(height: 8),
          Text(
            'Gerencie seus dados, preferencias e seguranca.',
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
                          user?.nome.isNotEmpty == true
                              ? user!.nome[0].toUpperCase()
                              : '?',
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
                        child: Icon(Icons.camera_alt_rounded,
                            color: Colors.white, size: 20),
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
              user?.tipo.isPrestador == true
                  ? 'Prestador AMAUC'
                  : 'Cidadão AMAUC',
              style: theme.textTheme.labelLarge
                  ?.copyWith(color: AppColors.primary),
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
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white),
                  )
                : const Text('Salvar alterações',
                    style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          const SizedBox(height: 28),
          _SettingsSection(
            title: 'Endereco principal',
            children: [
              _SettingsTile(
                icon: Icons.location_on_outlined,
                title: user?.cidadeAmauc ?? 'Cidade AMAUC',
                subtitle: 'Base para buscas e agendamentos',
                onTap: () => _mostrarErro('Edite a cidade pelo cadastro.'),
              ),
            ],
          ),
          _SettingsSection(
            title: 'Preferencias',
            children: [
              _SettingsTile(
                icon: Icons.notifications_none_rounded,
                title: 'Notificacoes Push',
                subtitle: 'Avisos de agendamentos e respostas',
                trailing: Switch(
                  value: _notificacoes,
                  onChanged: (value) => setState(() => _notificacoes = value),
                ),
              ),
              _SettingsTile(
                icon: Icons.contrast_rounded,
                title: 'Alto contraste',
                subtitle: 'Melhora a leitura em ambientes externos',
                trailing: Switch(
                  value: _altoContraste,
                  onChanged: (value) => setState(() => _altoContraste = value),
                ),
              ),
            ],
          ),
          _SettingsSection(
            title: 'Seguranca',
            children: [
              _SettingsTile(
                icon: Icons.lock_outline_rounded,
                title: 'Alterar senha',
                subtitle: 'Use a recuperacao de senha no login',
                onTap: () =>
                    _mostrarErro('Fluxo de senha ainda nao implementado.'),
              ),
            ],
          ),
          _SettingsSection(
            title: 'Mais',
            children: [
              _SettingsTile(
                icon: Icons.privacy_tip_outlined,
                title: 'Privacidade',
                subtitle: 'Dados usados somente no Conecta AMAUC',
                onTap: () =>
                    _mostrarErro('Documento de privacidade pendente.'),
              ),
              const _SettingsTile(
                icon: Icons.info_outline_rounded,
                title: 'Sobre o Conecta AMAUC',
                subtitle: 'Versao 1.0.0',
              ),
            ],
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

class _SettingsSection extends StatelessWidget {
  const _SettingsSection({
    required this.title,
    required this.children,
  });

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 2, bottom: 8),
            child: Text(
              title.toUpperCase(),
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0,
                  ),
            ),
          ),
          Container(
            decoration: BoxDecoration(
              color: AppColors.darkCard,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.darkBorder),
            ),
            child: Column(children: children),
          ),
        ],
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.trailing,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: AppColors.primary, size: 19),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: AppColors.textPrimaryDark,
                        ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    subtitle,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontSize: 12,
                        ),
                  ),
                ],
              ),
            ),
            trailing ??
                Icon(
                  Icons.chevron_right_rounded,
                  color: onTap == null ? AppColors.darkBorder : AppColors.muted,
                ),
          ],
        ),
      ),
    );
  }
}
