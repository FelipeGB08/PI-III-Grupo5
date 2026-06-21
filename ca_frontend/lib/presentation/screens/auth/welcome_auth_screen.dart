import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/validation/form_validators.dart';
import '../../../domain/entities/user.dart';
import '../../../domain/repositories/auth_repository.dart';
import '../../providers/providers.dart';
import '../../widgets/auth/auth_text_field.dart';
import '../../widgets/auth/register_wizard.dart';
import '../../widgets/auth/social_login_buttons.dart';

class WelcomeAuthScreen extends ConsumerStatefulWidget {
  const WelcomeAuthScreen({super.key});

  @override
  ConsumerState<WelcomeAuthScreen> createState() => _WelcomeAuthScreenState();
}

class _WelcomeAuthScreenState extends ConsumerState<WelcomeAuthScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _loginFormKey = GlobalKey<FormState>();
  final _registerFormKey = GlobalKey<FormState>();

  final _loginEmail = TextEditingController();
  final _loginSenha = TextEditingController();
  bool _obscureLoginSenha = true;
  bool _magicLinkMode = false;
  DateTime? _lastLoginSubmit;

  final _regNome = TextEditingController();
  final _regEmail = TextEditingController();
  final _regSenha = TextEditingController();
  final _regTelefone = TextEditingController();
  final _regBio = TextEditingController();

  UserTipo _tipoSelecionado = UserTipo.cidadao;
  final Set<String> _cidadesSelecionadas = {};
  final Set<String> _categoriasSelecionadas = {};

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _loginEmail.dispose();
    _loginSenha.dispose();
    _regNome.dispose();
    _regEmail.dispose();
    _regSenha.dispose();
    _regTelefone.dispose();
    _regBio.dispose();
    super.dispose();
  }

  bool _isDebounced(DateTime? lastTap, {int ms = 800}) {
    final now = DateTime.now();
    if (lastTap != null && now.difference(lastTap).inMilliseconds < ms) {
      return true;
    }
    return false;
  }

  Future<void> _login() async {
    if (_isDebounced(_lastLoginSubmit)) return;
    if (!_loginFormKey.currentState!.validate()) return;

    _lastLoginSubmit = DateTime.now();

    if (_magicLinkMode) {
      final ok = await ref
          .read(authStateProvider.notifier)
          .requestMagicLink(_loginEmail.text.trim());

      if (ok && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Link de acesso enviado para ${_loginEmail.text.trim()}. '
              'Verifique sua caixa de entrada.',
            ),
          ),
        );
      } else if (mounted) {
        _showError(ref.read(authStateProvider).error);
      }
      return;
    }

    final ok = await ref.read(authStateProvider.notifier).login(
          _loginEmail.text.trim(),
          _loginSenha.text,
        );
    if (ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Login realizado com sucesso!')),
      );
    } else if (mounted) {
      _showError(ref.read(authStateProvider).error);
    }
  }

  Future<void> _register() async {
    final ok = await ref.read(authStateProvider.notifier).register(
          RegisterParams(
            nome: _regNome.text.trim(),
            email: _regEmail.text.trim(),
            senha: _regSenha.text,
            tipo: _tipoSelecionado,
            bio: _regBio.text.trim(),
            telefoneComercial: _regTelefone.text.trim(),
            cidades: _cidadesSelecionadas.toList(),
            categorias: _categoriasSelecionadas.toList(),
          ),
        );

    if (ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Conta criada com sucesso!')),
      );
    } else if (mounted) {
      _showError(ref.read(authStateProvider).error);
    }
  }

  void _showError(String? msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg ?? 'Erro ao processar.'),
        backgroundColor: Colors.redAccent,
      ),
    );
  }

  void _showSocialComingSoon(String provider) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Login com $provider — integração OAuth em breve.'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authStateProvider);
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.05),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.arrow_back, color: Colors.white, size: 20),
          ),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.handshake, color: Colors.blueAccent, size: 24),
            const SizedBox(width: 8),
            Text(
              'AMAUC',
              style: theme.textTheme.titleMedium?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 430),
            child: Column(
              children: [
                const SizedBox(height: 16),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Container(
                    height: 50,
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: TabBar(
                      controller: _tabController,
                      indicator: BoxDecoration(
                        color: const Color(0xFF3B82F6),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      indicatorSize: TabBarIndicatorSize.tab,
                      dividerColor: Colors.transparent,
                      labelColor: Colors.white,
                      unselectedLabelColor: Colors.grey,
                      labelStyle: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                      tabs: const [
                        Tab(text: 'Entrar'),
                        Tab(text: 'Criar conta'),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Expanded(
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      _buildLoginForm(auth.isLoading),
                      _buildRegisterForm(auth.isLoading),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLoginForm(bool loading) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Form(
        key: _loginFormKey,
        autovalidateMode: AutovalidateMode.onUserInteraction,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Bem-vindo de volta',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Acesse sua conta para continuar conectando-se com os melhores serviços.',
              style: TextStyle(color: Colors.grey, fontSize: 14),
            ),
            const SizedBox(height: 24),
            _buildLoginModeToggle(),
            if (_magicLinkMode) ...[
              const SizedBox(height: 12),
              Text(
                'Entrar sem senha — receber link de acesso por e-mail.',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.5),
                  fontSize: 12,
                ),
              ),
            ],
            const SizedBox(height: 24),
            AuthTextField(
              controller: _loginEmail,
              label: 'E-mail',
              hint: 'seu@email.com',
              icon: Icons.email_outlined,
              keyboardType: TextInputType.emailAddress,
              textInputAction:
                  _magicLinkMode ? TextInputAction.done : TextInputAction.next,
              validator: FormValidators.email,
            ),
            if (!_magicLinkMode) ...[
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Senha',
                    style: TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                  TextButton(
                    onPressed: () {},
                    style: TextButton.styleFrom(
                      padding: EdgeInsets.zero,
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: const Text(
                      'Esqueci minha senha',
                      style: TextStyle(
                        color: Color(0xFF3B82F6),
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              AuthTextField(
                controller: _loginSenha,
                hint: '••••••••',
                icon: Icons.lock_outline,
                obscureText: _obscureLoginSenha,
                textInputAction: TextInputAction.done,
                suffixIcon: PasswordVisibilityToggle(
                  obscure: _obscureLoginSenha,
                  onToggle: () =>
                      setState(() => _obscureLoginSenha = !_obscureLoginSenha),
                ),
                validator: FormValidators.password,
              ),
            ],
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: loading ? null : _login,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF3B82F6),
                disabledBackgroundColor:
                    const Color(0xFF3B82F6).withValues(alpha: 0.5),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: loading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          _magicLinkMode
                              ? 'Enviar link por e-mail'
                              : 'Continuar',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        if (!_magicLinkMode) ...[
                          const SizedBox(width: 8),
                          const Icon(
                            Icons.arrow_forward,
                            color: Colors.white,
                            size: 20,
                          ),
                        ],
                      ],
                    ),
            ),
            const SizedBox(height: 32),
            Row(
              children: [
                const Expanded(child: Divider(color: Colors.white24)),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Text(
                    'OU CONTINUE COM',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.4),
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const Expanded(child: Divider(color: Colors.white24)),
              ],
            ),
            const SizedBox(height: 24),
            SocialLoginButtons(
              enabled: !loading,
              onGoogleTap: () => _showSocialComingSoon('Google'),
              onAppleTap: () => _showSocialComingSoon('Apple'),
              onGitHubTap: () => _showSocialComingSoon('GitHub'),
            ),
          ],
        ),
      ),
    ).animate().fadeIn();
  }

  Widget _buildLoginModeToggle() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Expanded(
            child: _LoginModeChip(
              label: 'Com senha',
              icon: Icons.lock_outline,
              selected: !_magicLinkMode,
              onTap: () => setState(() => _magicLinkMode = false),
            ),
          ),
          Expanded(
            child: _LoginModeChip(
              label: 'Sem senha',
              icon: Icons.mail_outline,
              selected: _magicLinkMode,
              onTap: () => setState(() => _magicLinkMode = true),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRegisterForm(bool loading) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Crie sua conta',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Junte-se à maior plataforma de serviços da região.',
            style: TextStyle(color: Colors.grey, fontSize: 14),
          ),
          const SizedBox(height: 24),
          RegisterWizard(
            formKey: _registerFormKey,
            loading: loading,
            onRegister: _register,
            tipoSelecionado: _tipoSelecionado,
            onTipoChanged: (tipo) => setState(() => _tipoSelecionado = tipo),
            nomeController: _regNome,
            emailController: _regEmail,
            senhaController: _regSenha,
            telefoneController: _regTelefone,
            bioController: _regBio,
            cidadesSelecionadas: _cidadesSelecionadas,
            categoriasSelecionadas: _categoriasSelecionadas,
            onCidadesChanged: () => setState(() {}),
            onCategoriasChanged: () => setState(() {}),
          ),
        ],
      ),
    ).animate().fadeIn();
  }
}

class _LoginModeChip extends StatelessWidget {
  const _LoginModeChip({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFF3B82F6) : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 16,
              color: selected ? Colors.white : Colors.white54,
            ),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: selected ? Colors.white : Colors.white54,
                  fontSize: 12,
                  fontWeight: selected ? FontWeight.bold : FontWeight.normal,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
