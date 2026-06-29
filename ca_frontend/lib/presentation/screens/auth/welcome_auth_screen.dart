import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

import '../../../core/config/amauc_constants.dart';
import '../../../core/config/app_env.dart';
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
  bool _handledInitialLink = false;
  bool _googleInitialized = false;

  String get _googleClientId => AppEnv.googleClientId;
  String get _googleServerClientId => AppEnv.googleServerClientId;
  String get _appleClientId => AppEnv.appleClientId;
  String get _appleRedirectUri => AppEnv.appleRedirectUri;

  final _regNome = TextEditingController();
  final _regEmail = TextEditingController();
  final _regSenha = TextEditingController();
  final _regTelefone = TextEditingController();
  final _regEndereco = TextEditingController();
  final _regBio = TextEditingController();
  double? _regLatitude;
  double? _regLongitude;

  UserTipo _tipoSelecionado = UserTipo.cidadao;
  final Set<String> _cidadesSelecionadas = {};
  final Set<String> _categoriasSelecionadas = {};

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance
        .addPostFrameCallback((_) => _handleInitialAuthLink());
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
    _regEndereco.dispose();
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
      final devToken = await ref
          .read(authStateProvider.notifier)
          .requestMagicLink(_loginEmail.text.trim());

      if (devToken != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Link de acesso enviado para ${_loginEmail.text.trim()}. '
              'Verifique sua caixa de entrada.',
            ),
          ),
        );
        await _confirmMagicLink(devToken.isEmpty ? null : devToken);
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
            cidadeAmauc: _cidadesSelecionadas.first,
            enderecoPrincipal: _regEndereco.text.trim(),
            latitude: _regLatitude,
            longitude: _regLongitude,
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

  Future<void> _confirmMagicLink(String? devToken) async {
    final token = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _MagicLinkVerifySheet(devToken: devToken),
    );
    if (token == null) return;

    final ok =
        await ref.read(authStateProvider.notifier).verifyMagicLink(token);
    if (ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Login realizado com sucesso!')),
      );
    } else if (mounted) {
      _showError(ref.read(authStateProvider).error);
    }
  }

  Future<void> _handleInitialAuthLink() async {
    if (_handledInitialLink || !mounted) return;
    _handledInitialLink = true;

    final uri = Uri.base;
    final mode = uri.queryParameters['mode'];
    final token = uri.queryParameters['token'];
    if (token == null || token.trim().isEmpty) return;

    if (mode == 'magic-link') {
      final ok = await ref
          .read(authStateProvider.notifier)
          .verifyMagicLink(token.trim());
      if (!mounted) return;
      if (ok) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Login realizado com sucesso!')),
        );
      } else {
        _showError(ref.read(authStateProvider).error);
      }
      return;
    }

    if (mode == 'reset-password') {
      final changed = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => _PasswordResetSheet(
          initialEmail: _loginEmail.text.trim(),
          initialToken: token.trim(),
        ),
      );
      if (changed == true && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Senha alterada com sucesso!')),
        );
      }
    }
  }

  Future<void> _forgotPassword() async {
    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) =>
          _PasswordResetSheet(initialEmail: _loginEmail.text.trim()),
    );
    if (changed == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Senha alterada com sucesso!')),
      );
    }
  }

  Future<void> _socialLogin(String provider) async {
    final providerKey = provider.toLowerCase();

    if (providerKey == 'github') {
      final data = await showModalBottomSheet<_SocialLoginData>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => _SocialLoginSheet(provider: provider),
      );
      if (data == null) return;
      await _finishSocialLogin(provider, providerKey, data.token, data.cidade);
      return;
    }

    final cidade = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _SocialCitySheet(provider: provider),
    );
    if (cidade == null) return;

    try {
      final token = providerKey == 'google'
          ? await _obterGoogleIdToken()
          : await _obterAppleIdentityToken();
      await _finishSocialLogin(provider, providerKey, token, cidade);
    } catch (e) {
      if (mounted) {
        _showError(_formatSocialError(provider, e));
      }
    }
  }

  Future<void> _finishSocialLogin(
    String providerLabel,
    String providerKey,
    String token,
    String cidade,
  ) async {
    if (!mounted) return;

    final ok = await ref.read(authStateProvider.notifier).socialLogin(
          provider: providerKey,
          token: token,
          cidadeAmauc: cidade,
        );

    if (ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Login com $providerLabel realizado com sucesso!'),
        ),
      );
    } else if (mounted) {
      _showError(ref.read(authStateProvider).error);
    }
  }

  Future<String> _obterGoogleIdToken() async {
    if (!_googleInitialized) {
      await GoogleSignIn.instance.initialize(
        clientId: _googleClientId.isEmpty ? null : _googleClientId,
        serverClientId:
            _googleServerClientId.isEmpty ? null : _googleServerClientId,
      );
      _googleInitialized = true;
    }

    if (!GoogleSignIn.instance.supportsAuthenticate()) {
      throw StateError(
        'Google Sign-In nao esta disponivel nesta plataforma com botao customizado.',
      );
    }

    final account = await GoogleSignIn.instance.authenticate();
    final token = account.authentication.idToken;
    if (token == null || token.isEmpty) {
      throw StateError('Google nao retornou ID token.');
    }
    return token;
  }

  Future<String> _obterAppleIdentityToken() async {
    final disponivel = await SignInWithApple.isAvailable();
    if (!disponivel) {
      throw StateError(
          'Login com Apple nao esta disponivel neste dispositivo.');
    }

    final precisaFluxoWeb =
        defaultTargetPlatform == TargetPlatform.android || kIsWeb;
    final webOptions = precisaFluxoWeb ? _appleWebOptions() : null;

    final credential = await SignInWithApple.getAppleIDCredential(
      scopes: const [
        AppleIDAuthorizationScopes.email,
        AppleIDAuthorizationScopes.fullName,
      ],
      webAuthenticationOptions: webOptions,
    );

    final token = credential.identityToken;
    if (token == null || token.isEmpty) {
      throw StateError('Apple nao retornou identity token.');
    }
    return token;
  }

  WebAuthenticationOptions _appleWebOptions() {
    if (_appleClientId.isEmpty || _appleRedirectUri.isEmpty) {
      throw StateError(
        'Configure APPLE_CLIENT_ID e APPLE_REDIRECT_URI com --dart-define.',
      );
    }

    return WebAuthenticationOptions(
      clientId: _appleClientId,
      redirectUri: Uri.parse(_appleRedirectUri),
    );
  }

  String _formatSocialError(String provider, Object error) {
    if (error is GoogleSignInException) {
      if (error.code == GoogleSignInExceptionCode.canceled) {
        return 'Login com $provider cancelado.';
      }
      return error.description ?? 'Erro ao entrar com $provider.';
    }
    final texto = error.toString().replaceFirst('Bad state: ', '');
    return texto.replaceFirst('Exception: ', '');
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
                    onPressed: loading ? null : _forgotPassword,
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
              onGoogleTap: () => _socialLogin('Google'),
              onAppleTap: () => _socialLogin('Apple'),
              onGitHubTap: () => _socialLogin('GitHub'),
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
            enderecoController: _regEndereco,
            bioController: _regBio,
            cidadesSelecionadas: _cidadesSelecionadas,
            categoriasSelecionadas: _categoriasSelecionadas,
            onLocationChanged: (lat, lng) {
              _regLatitude = lat;
              _regLongitude = lng;
            },
            onCidadesChanged: () => setState(() {}),
            onCategoriasChanged: () => setState(() {}),
          ),
        ],
      ),
    ).animate().fadeIn();
  }
}

class _AuthBottomSheetFrame extends StatelessWidget {
  const _AuthBottomSheetFrame({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          left: 18,
          right: 18,
          bottom: MediaQuery.of(context).viewInsets.bottom + 18,
        ),
        child: Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.86,
          ),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
          ),
          child: SingleChildScrollView(child: child),
        ),
      ),
    );
  }
}

class _MagicLinkVerifySheet extends StatefulWidget {
  const _MagicLinkVerifySheet({this.devToken});

  final String? devToken;

  @override
  State<_MagicLinkVerifySheet> createState() => _MagicLinkVerifySheetState();
}

class _MagicLinkVerifySheetState extends State<_MagicLinkVerifySheet> {
  final _formKey = GlobalKey<FormState>();
  final _tokenController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tokenController.text = widget.devToken ?? '';
  }

  @override
  void dispose() {
    _tokenController.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    Navigator.pop(context, _tokenController.text.trim());
  }

  @override
  Widget build(BuildContext context) {
    return _AuthBottomSheetFrame(
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Confirmar acesso',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              widget.devToken == null
                  ? 'Informe o token recebido por e-mail para entrar.'
                  : 'Ambiente local: o token de teste ja foi preenchido.',
              style: TextStyle(color: Colors.white.withValues(alpha: 0.55)),
            ),
            const SizedBox(height: 18),
            AuthTextField(
              controller: _tokenController,
              label: 'Token de acesso',
              hint: 'Cole o token aqui',
              icon: Icons.mark_email_read_outlined,
              maxLines: 2,
              validator: (value) {
                if (value == null || value.trim().length < 20) {
                  return 'Informe um token valido.';
                }
                return null;
              },
              textInputAction: TextInputAction.done,
            ),
            const SizedBox(height: 18),
            ElevatedButton.icon(
              onPressed: _submit,
              icon: const Icon(Icons.login_rounded, color: Colors.white),
              label: const Text(
                'Entrar',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF3B82F6),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PasswordResetSheet extends ConsumerStatefulWidget {
  const _PasswordResetSheet({
    required this.initialEmail,
    this.initialToken,
  });

  final String initialEmail;
  final String? initialToken;

  @override
  ConsumerState<_PasswordResetSheet> createState() =>
      _PasswordResetSheetState();
}

class _PasswordResetSheetState extends ConsumerState<_PasswordResetSheet> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _tokenController = TextEditingController();
  final _senhaController = TextEditingController();
  bool _obscureSenha = true;
  bool _tokenRequested = false;

  @override
  void initState() {
    super.initState();
    _emailController.text = widget.initialEmail;
    if (widget.initialToken?.isNotEmpty == true) {
      _tokenController.text = widget.initialToken!;
      _tokenRequested = true;
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _tokenController.dispose();
    _senhaController.dispose();
    super.dispose();
  }

  void _showError(String? msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg ?? 'Erro ao processar.'),
        backgroundColor: Colors.redAccent,
      ),
    );
  }

  Future<void> _requestToken() async {
    final emailError = FormValidators.email(_emailController.text);
    if (emailError != null) {
      _showError(emailError);
      return;
    }

    final devToken = await ref
        .read(authStateProvider.notifier)
        .requestPasswordReset(_emailController.text.trim());
    if (!mounted) return;

    if (devToken == null) {
      _showError(ref.read(authStateProvider).error);
      return;
    }

    setState(() {
      _tokenRequested = true;
      if (devToken.isNotEmpty) {
        _tokenController.text = devToken;
      }
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Token de redefinicao enviado.')),
    );
  }

  Future<void> _confirm() async {
    if (!_formKey.currentState!.validate()) return;

    final ok = await ref.read(authStateProvider.notifier).confirmPasswordReset(
          token: _tokenController.text.trim(),
          senha: _senhaController.text,
        );
    if (!mounted) return;

    if (ok) {
      Navigator.pop(context, true);
    } else {
      _showError(ref.read(authStateProvider).error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final loading = ref.watch(authStateProvider).isLoading;

    return _AuthBottomSheetFrame(
      child: Form(
        key: _formKey,
        autovalidateMode: AutovalidateMode.onUserInteraction,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Redefinir senha',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              _tokenRequested
                  ? 'Informe o token recebido e escolha a nova senha.'
                  : 'Informe seu e-mail para receber o token de recuperacao.',
              style: TextStyle(color: Colors.white.withValues(alpha: 0.55)),
            ),
            const SizedBox(height: 18),
            AuthTextField(
              controller: _emailController,
              label: 'E-mail',
              hint: 'seu@email.com',
              icon: Icons.email_outlined,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              validator: FormValidators.email,
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: loading ? null : _requestToken,
              icon: const Icon(Icons.send_outlined),
              label: const Text('Enviar token'),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.white,
                side: BorderSide(color: Colors.white.withValues(alpha: 0.18)),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
            const SizedBox(height: 16),
            AuthTextField(
              controller: _tokenController,
              label: 'Token',
              hint: 'Cole o token recebido',
              icon: Icons.key_rounded,
              maxLines: 2,
              validator: (value) {
                if (value == null || value.trim().length < 20) {
                  return 'Informe o token recebido.';
                }
                return null;
              },
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 14),
            AuthTextField(
              controller: _senhaController,
              label: 'Nova senha',
              hint: 'Digite a nova senha',
              icon: Icons.lock_reset_rounded,
              obscureText: _obscureSenha,
              suffixIcon: PasswordVisibilityToggle(
                obscure: _obscureSenha,
                onToggle: () => setState(() => _obscureSenha = !_obscureSenha),
              ),
              validator: FormValidators.password,
              textInputAction: TextInputAction.done,
            ),
            const SizedBox(height: 18),
            ElevatedButton.icon(
              onPressed: loading ? null : _confirm,
              icon: loading
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.check_rounded, color: Colors.white),
              label: const Text(
                'Alterar senha',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF3B82F6),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SocialLoginData {
  const _SocialLoginData({
    required this.token,
    required this.cidade,
  });

  final String token;
  final String cidade;
}

class _SocialCitySheet extends StatefulWidget {
  const _SocialCitySheet({required this.provider});

  final String provider;

  @override
  State<_SocialCitySheet> createState() => _SocialCitySheetState();
}

class _SocialCitySheetState extends State<_SocialCitySheet> {
  final _formKey = GlobalKey<FormState>();
  String? _cidade;

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    Navigator.pop(context, _cidade);
  }

  @override
  Widget build(BuildContext context) {
    return _AuthBottomSheetFrame(
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Continuar com ${widget.provider}',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Selecione sua cidade AMAUC para completar o acesso.',
              style: TextStyle(color: Colors.white.withValues(alpha: 0.55)),
            ),
            const SizedBox(height: 18),
            DropdownButtonFormField<String>(
              initialValue: _cidade,
              dropdownColor: const Color(0xFF1E293B),
              decoration: InputDecoration(
                filled: true,
                fillColor: const Color(0xFF1E293B),
                prefixIcon: const Icon(Icons.location_city_outlined),
                hintText: 'Cidade AMAUC',
                hintStyle: TextStyle(
                  color: Colors.white.withValues(alpha: 0.45),
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide.none,
                ),
              ),
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
              ),
              items: AmaucConstants.cidades
                  .map(
                    (cidade) => DropdownMenuItem(
                      value: cidade,
                      child: Text(cidade),
                    ),
                  )
                  .toList(),
              onChanged: (cidade) => setState(() => _cidade = cidade),
              validator: (value) =>
                  value == null ? 'Selecione sua cidade AMAUC.' : null,
            ),
            const SizedBox(height: 18),
            ElevatedButton.icon(
              onPressed: _submit,
              icon: const Icon(Icons.login_rounded, color: Colors.white),
              label: Text(
                'Entrar com ${widget.provider}',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF3B82F6),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SocialLoginSheet extends StatefulWidget {
  const _SocialLoginSheet({required this.provider});

  final String provider;

  @override
  State<_SocialLoginSheet> createState() => _SocialLoginSheetState();
}

class _SocialLoginSheetState extends State<_SocialLoginSheet> {
  final _formKey = GlobalKey<FormState>();
  final _tokenController = TextEditingController();
  String? _cidade;

  @override
  void dispose() {
    _tokenController.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    Navigator.pop(
      context,
      _SocialLoginData(
        token: _tokenController.text.trim(),
        cidade: _cidade!,
      ),
    );
  }

  String _tokenLabel(String provider) {
    return provider.toLowerCase() == 'github'
        ? 'GitHub access token'
        : '$provider ID token';
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          left: 18,
          right: 18,
          bottom: MediaQuery.of(context).viewInsets.bottom + 18,
        ),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
          ),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Continuar com ${widget.provider}',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Cole o token real do provedor. Google/Apple usam ID token; GitHub usa access token.',
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.55)),
                ),
                const SizedBox(height: 18),
                AuthTextField(
                  controller: _tokenController,
                  label: _tokenLabel(widget.provider),
                  hint: 'Cole o token aqui',
                  icon: Icons.key_rounded,
                  maxLines: 3,
                  validator: (value) {
                    if (value == null || value.trim().length < 20) {
                      return 'Informe um token válido do provedor.';
                    }
                    return null;
                  },
                  textInputAction: TextInputAction.next,
                ),
                const SizedBox(height: 14),
                DropdownButtonFormField<String>(
                  initialValue: _cidade,
                  dropdownColor: const Color(0xFF1E293B),
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: const Color(0xFF1E293B),
                    prefixIcon: const Icon(Icons.location_city_outlined),
                    hintText: 'Cidade AMAUC',
                    hintStyle:
                        TextStyle(color: Colors.white.withValues(alpha: 0.45)),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide.none,
                    ),
                  ),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                  items: AmaucConstants.cidades
                      .map(
                        (cidade) => DropdownMenuItem(
                          value: cidade,
                          child: Text(cidade),
                        ),
                      )
                      .toList(),
                  onChanged: (cidade) => setState(() => _cidade = cidade),
                  validator: (value) =>
                      value == null ? 'Selecione sua cidade AMAUC.' : null,
                ),
                const SizedBox(height: 18),
                ElevatedButton.icon(
                  onPressed: _submit,
                  icon: const Icon(Icons.login_rounded, color: Colors.white),
                  label: Text(
                    'Entrar com ${widget.provider}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF3B82F6),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
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
