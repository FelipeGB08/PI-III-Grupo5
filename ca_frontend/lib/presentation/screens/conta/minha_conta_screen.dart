import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/network/api_error_formatter.dart';
import '../../../core/theme/app_colors.dart';
import '../../../domain/entities/user.dart';
import '../../providers/providers.dart';
import '../../widgets/profile_avatar.dart';
import '../financeiro/financeiro_screen.dart';

class MinhaContaScreen extends ConsumerStatefulWidget {
  const MinhaContaScreen({super.key});

  @override
  ConsumerState<MinhaContaScreen> createState() => _MinhaContaScreenState();
}

class _MinhaContaScreenState extends ConsumerState<MinhaContaScreen> {
  final _nomeController = TextEditingController();
  final _telefoneController = TextEditingController();
  final _enderecoController = TextEditingController();
  final _picker = ImagePicker();

  bool _salvando = false;
  bool _carregandoPerfil = true;
  bool _notificacoes = true;
  bool _altoContraste = true;
  bool _capturandoLocalizacao = false;
  XFile? _fotoLocal;
  Uint8List? _fotoPreviewBytes;
  String? _fotoUrlRemota;
  double? _latitude;
  double? _longitude;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _carregarPerfil());
  }

  @override
  void dispose() {
    _nomeController.dispose();
    _telefoneController.dispose();
    _enderecoController.dispose();
    super.dispose();
  }

  Future<void> _carregarPerfil() async {
    final user = ref.read(authStateProvider).user;
    if (user != null) _preencherCampos(user);

    final atualizado =
        await ref.read(authStateProvider.notifier).refreshProfile();
    if (!mounted) return;

    setState(() {
      _carregandoPerfil = false;
      if (atualizado != null) _preencherCampos(atualizado);
    });
  }

  void _preencherCampos(User user) {
    _nomeController.text = user.nome;
    _telefoneController.text = user.telefone ?? '';
    _enderecoController.text = user.enderecoPrincipal ?? '';
    _latitude = user.latitude;
    _longitude = user.longitude;
    _fotoUrlRemota = user.fotoUrl;
  }

  Future<void> _capturarLocalizacao() async {
    if (_capturandoLocalizacao) return;
    setState(() => _capturandoLocalizacao = true);
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        _mostrarErro('Permita a localização para salvar o ponto exato.');
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
      if (!mounted) return;
      setState(() {
        _latitude = position.latitude;
        _longitude = position.longitude;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Localização atual capturada.')),
      );
    } catch (_) {
      if (!mounted) return;
      _mostrarErro('Não foi possível capturar sua localização agora.');
    } finally {
      if (mounted) setState(() => _capturandoLocalizacao = false);
    }
  }

  Future<void> _trocarFoto() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: AppColors.darkCard,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.photo_library_rounded),
                title: const Text('Escolher da galeria'),
                onTap: () => Navigator.pop(ctx, ImageSource.gallery),
              ),
              ListTile(
                leading: const Icon(Icons.photo_camera_rounded),
                title: const Text('Usar camera'),
                onTap: () => Navigator.pop(ctx, ImageSource.camera),
              ),
            ],
          ),
        ),
      ),
    );
    if (source == null) return;

    final imagem = await _picker.pickImage(
      source: source,
      maxWidth: 1024,
      imageQuality: 85,
    );
    if (imagem == null || !mounted) return;

    final bytes = await imagem.readAsBytes();
    setState(() {
      _fotoLocal = imagem;
      _fotoPreviewBytes = bytes;
    });
  }

  Future<void> _salvar() async {
    final nome = _nomeController.text.trim();
    if (nome.length < 2) {
      _mostrarErro('Informe um nome valido.');
      return;
    }

    setState(() => _salvando = true);

    String? fotoUrl = _fotoUrlRemota;
    if (_fotoLocal != null) {
      if (kIsWeb) {
        fotoUrl = await ref.read(authStateProvider.notifier).uploadAvatarBytes(
              bytes: _fotoPreviewBytes ?? await _fotoLocal!.readAsBytes(),
              filename: _fotoLocal!.name,
            );
      } else {
        fotoUrl = await ref
            .read(authStateProvider.notifier)
            .uploadAvatar(_fotoLocal!.path);
      }

      if (fotoUrl == null || fotoUrl.isEmpty) {
        if (!mounted) return;
        setState(() => _salvando = false);
        _mostrarErro(
            ref.read(authStateProvider).error ?? 'Falha ao enviar foto.');
        return;
      }
    }

    final ok = await ref.read(authStateProvider.notifier).updateProfile(
          nome: nome,
          telefone: _telefoneController.text.trim(),
          enderecoPrincipal: _enderecoController.text.trim(),
          latitude: _latitude,
          longitude: _longitude,
          fotoUrl: fotoUrl,
        );

    if (!mounted) return;

    setState(() {
      _salvando = false;
      if (ok) {
        _fotoLocal = null;
        _fotoPreviewBytes = null;
        _fotoUrlRemota = ref.read(authStateProvider).user?.fotoUrl;
      }
    });

    if (ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Perfil atualizado com sucesso!')),
      );
    } else {
      _mostrarErro(
          ref.read(authStateProvider).error ?? 'Nao foi possivel salvar.');
    }
  }

  void _mostrarErro(String mensagem) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(formatApiError(mensagem))),
    );
  }

  Future<void> _mostrarPrivacidade() {
    return showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Privacidade'),
        content: const SingleChildScrollView(
          child: Text(
            'O Conecta AMAUC utiliza seus dados de cadastro, cidade, foto, '
            'agenda e historico de solicitacoes apenas para operar a '
            'plataforma, autenticar o usuario, exibir profissionais, registrar '
            'servicos e enviar notificacoes. As informacoes podem ser revisadas '
            'pela equipe do projeto para suporte, seguranca e demonstracao '
            'academica. Evite compartilhar senhas ou dados sensiveis nas '
            'observacoes dos agendamentos.',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Fechar'),
          ),
        ],
      ),
    );
  }

  Future<void> _sair() async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sair da conta'),
        content: const Text('Deseja encerrar sua sessao neste dispositivo?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Sair'),
          ),
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
    final cidade = user?.cidadeAmauc;

    if (_carregandoPerfil && user == null) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Perfil',
            style: theme.textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.w900,
              color: AppColors.textPrimaryDark,
            ),
          ).animate().fadeIn().slideY(begin: 0.1),
          const SizedBox(height: 8),
          Text(
            'Gerencie seus dados, foto e preferencias.',
            style: theme.textTheme.bodyMedium?.copyWith(color: AppColors.muted),
          ),
          const SizedBox(height: 22),
          _ProfileHeader(
            user: user,
            fotoUrl: _fotoUrlRemota,
            previewBytes: _fotoPreviewBytes,
            salvando: _salvando,
            onTrocarFoto: _trocarFoto,
          ),
          const SizedBox(height: 22),
          _FormPanel(
            children: [
              TextField(
                controller: _nomeController,
                decoration: const InputDecoration(
                  labelText: 'Nome completo',
                  prefixIcon: Icon(Icons.person_outline_rounded),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _telefoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Telefone',
                  prefixIcon: Icon(Icons.phone_outlined),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _enderecoController,
                decoration: const InputDecoration(
                  labelText: 'Endereço principal',
                  prefixIcon: Icon(Icons.home_outlined),
                ),
              ),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                onPressed: _capturandoLocalizacao ? null : _capturarLocalizacao,
                icon: _capturandoLocalizacao
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.my_location_rounded),
                label: Text(
                  _latitude != null && _longitude != null
                      ? 'Atualizar localização exata'
                      : 'Capturar localização exata',
                ),
              ),
              const SizedBox(height: 14),
              _ReadonlyField(
                icon: Icons.email_outlined,
                label: 'E-mail',
                value: user?.email ?? '',
              ),
              if (cidade != null && cidade.isNotEmpty) ...[
                const SizedBox(height: 14),
                _ReadonlyField(
                  icon: Icons.location_city_outlined,
                  label: 'Cidade AMAUC',
                  value: cidade,
                ),
              ],
              const SizedBox(height: 18),
              FilledButton.icon(
                onPressed: _salvando ? null : _salvar,
                icon: _salvando
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.save_rounded),
                label: Text(_salvando ? 'Salvando...' : 'Salvar alteracoes'),
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 15),
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 22),
          _SettingsSection(
            title: 'Endereço principal',
            children: [
              _SettingsTile(
                icon: Icons.location_on_outlined,
                title: _enderecoController.text.trim().isNotEmpty
                    ? _enderecoController.text.trim()
                    : (cidade ?? 'Cidade AMAUC'),
                subtitle: _latitude != null && _longitude != null
                    ? 'Ponto exato salvo para mapa e agendamentos'
                    : 'Use o botao acima para salvar o ponto exato',
                onTap: _capturarLocalizacao,
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
                onTap: () => _mostrarErro(
                    'Fluxo de senha disponivel pela tela de login.'),
              ),
            ],
          ),
          _SettingsSection(
            title: 'Mais',
            children: [
              _SettingsTile(
                icon: Icons.account_balance_wallet_outlined,
                title: 'Financeiro e orçamentos',
                subtitle: 'Valores, status e histórico de serviços',
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const FinanceiroScreen(),
                  ),
                ),
              ),
              _SettingsTile(
                icon: Icons.privacy_tip_outlined,
                title: 'Privacidade',
                subtitle: 'Dados usados somente no Conecta AMAUC',
                onTap: _mostrarPrivacidade,
              ),
              const _SettingsTile(
                icon: Icons.info_outline_rounded,
                title: 'Sobre o Conecta AMAUC',
                subtitle: 'Versao 1.0.0',
              ),
            ],
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _sair,
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Sair da conta'),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.statusRecusado,
              side: BorderSide(
                color: AppColors.statusRecusado.withValues(alpha: 0.45),
              ),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({
    required this.user,
    required this.fotoUrl,
    required this.previewBytes,
    required this.salvando,
    required this.onTrocarFoto,
  });

  final User? user;
  final String? fotoUrl;
  final Uint8List? previewBytes;
  final bool salvando;
  final VoidCallback onTrocarFoto;

  @override
  Widget build(BuildContext context) {
    final tipo = user?.tipo.isPrestador == true
        ? 'Prestador AMAUC'
        : user?.tipo.isAdmin == true
            ? 'Administrador'
            : 'Cidadao AMAUC';

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.darkCard,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.darkBorder),
      ),
      child: Row(
        children: [
          ProfileAvatar(
            name: user?.nome ?? 'Usuario',
            imageUrl: fotoUrl,
            previewBytes: previewBytes,
            radius: 42,
            showEdit: true,
            onEdit: salvando ? null : onTrocarFoto,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  user?.nome ?? 'Usuario',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: AppColors.textPrimaryDark,
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _InfoPill(icon: Icons.verified_user_outlined, label: tipo),
                    if (user?.cidadeAmauc?.isNotEmpty == true)
                      _InfoPill(
                        icon: Icons.location_on_outlined,
                        label: user!.cidadeAmauc!,
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoPill extends StatelessWidget {
  const _InfoPill({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.11),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.22)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppColors.primary),
          const SizedBox(width: 5),
          Text(
            label,
            style: const TextStyle(
              color: AppColors.textPrimaryDark,
              fontSize: 11,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _FormPanel extends StatelessWidget {
  const _FormPanel({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.darkSurface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.darkBorder),
      ),
      child: Column(children: children),
    );
  }
}

class _ReadonlyField extends StatelessWidget {
  const _ReadonlyField({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return InputDecorator(
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon),
        enabled: false,
      ),
      child: Text(
        value,
        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
              color: AppColors.textPrimaryDark,
              fontWeight: FontWeight.w700,
            ),
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
