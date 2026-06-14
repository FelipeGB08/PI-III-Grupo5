import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/amauc_constants.dart';
import '../../../domain/entities/user.dart';
import '../../../domain/repositories/auth_repository.dart'; 
import '../../providers/providers.dart';
import '../home/home_shell.dart';

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

  final _regNome = TextEditingController();
  final _regEmail = TextEditingController();
  final _regSenha = TextEditingController();
  final _regTelefone = TextEditingController();
  final _regBio = TextEditingController();
  bool _obscureRegSenha = true;

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

  Future<void> _login() async {
    if (!_loginFormKey.currentState!.validate()) return;
    final ok = await ref.read(authStateProvider.notifier).login(
          _loginEmail.text.trim(),
          _loginSenha.text,
        );
    if (ok && mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const HomeShell()),
      );
    } else if (mounted) {
      _showError(ref.read(authStateProvider).error);
    }
  }

  Future<void> _register() async {
    if (!_registerFormKey.currentState!.validate()) return;

    if (_tipoSelecionado.isPrestador) {
      if (_cidadesSelecionadas.isEmpty || _categoriasSelecionadas.isEmpty) {
        _showError('Selecione ao menos uma cidade e uma categoria.');
        return;
      }
    }

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
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const HomeShell()),
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

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authStateProvider);
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Fundo azul escuro do wireframe
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
                // TabBar fiel ao design (Pílula)
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
                        color: const Color(0xFF3B82F6), // Azul do botão
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
                // Telas do TabBar
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
            const SizedBox(height: 32),
            
            // Campo E-mail
            const Text('E-mail', style: TextStyle(color: Colors.white70, fontSize: 12)),
            const SizedBox(height: 8),
            TextFormField(
              controller: _loginEmail,
              keyboardType: TextInputType.emailAddress,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'seu@email.com',
                hintStyle: const TextStyle(color: Colors.white30),
                prefixIcon: const Icon(Icons.email_outlined, color: Colors.white54),
                filled: true,
                fillColor: const Color(0xFF1E293B),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
              validator: (v) =>
                  v == null || !v.contains('@') ? 'E-mail inválido' : null,
            ),
            const SizedBox(height: 20),

            // Campo Senha e "Esqueci minha senha"
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Senha', style: TextStyle(color: Colors.white70, fontSize: 12)),
                TextButton(
                  onPressed: () {}, // Futura rota de recuperar senha
                  style: TextButton.styleFrom(
                    padding: EdgeInsets.zero,
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: const Text(
                    'Esqueci minha senha',
                    style: TextStyle(color: Color(0xFF3B82F6), fontSize: 12),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _loginSenha,
              obscureText: _obscureLoginSenha,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: '••••••••',
                hintStyle: const TextStyle(color: Colors.white30),
                prefixIcon: const Icon(Icons.lock_outline, color: Colors.white54),
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscureLoginSenha ? Icons.visibility_off : Icons.visibility,
                    color: Colors.white54,
                  ),
                  onPressed: () {
                    setState(() {
                      _obscureLoginSenha = !_obscureLoginSenha;
                    });
                  },
                ),
                filled: true,
                fillColor: const Color(0xFF1E293B),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
              validator: (v) =>
                  v == null || v.length < 6 ? 'Mínimo 6 caracteres' : null,
            ),
            const SizedBox(height: 32),

            // Botão Continuar
            ElevatedButton(
              onPressed: loading ? null : _login,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF3B82F6),
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
                  : const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Continuar',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        SizedBox(width: 8),
                        Icon(Icons.arrow_forward, color: Colors.white, size: 20),
                      ],
                    ),
            ),
            const SizedBox(height: 32),

            // Divisor "OU CONTINUE COM"
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

            // Botões Sociais
            _SocialButton(
              icon: Icons.g_mobiledata_rounded,
              label: 'Google',
              onTap: () {},
            ),
            const SizedBox(height: 12),
            _SocialButton(
              icon: Icons.apple,
              label: 'Apple',
              onTap: () {},
            ),
          ],
        ),
      ),
    ).animate().fadeIn();
  }

  Widget _buildRegisterForm(bool loading) {
    // Mantive a estrutura do seu formulário de registro original, 
    // apenas apliquei o fundo escuro e o estilo visual dos inputs.
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Form(
        key: _registerFormKey,
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
            Row(
              children: [
                Expanded(
                  child: _RoleCard(
                    title: 'Cliente',
                    subtitle: 'Quero Contratar',
                    icon: Icons.search_rounded,
                    selected: _tipoSelecionado.isCliente,
                    onTap: () => setState(() {
                      _tipoSelecionado = UserTipo.cidadao;
                      HapticFeedback.lightImpact();
                    }),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _RoleCard(
                    title: 'Prestador',
                    subtitle: 'Quero Trabalhar',
                    icon: Icons.handyman_rounded,
                    selected: _tipoSelecionado.isPrestador,
                    onTap: () => setState(() {
                      _tipoSelecionado = UserTipo.profissional;
                      HapticFeedback.lightImpact();
                    }),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            _buildDarkTextField(
              controller: _regNome,
              hint: 'Nome completo',
              icon: Icons.person_outline,
              validator: (v) => v == null || v.isEmpty ? 'Informe seu nome' : null,
            ),
            const SizedBox(height: 12),
            _buildDarkTextField(
              controller: _regEmail,
              hint: 'E-mail',
              icon: Icons.email_outlined,
              keyboardType: TextInputType.emailAddress,
              validator: (v) => v == null || !v.contains('@') ? 'E-mail inválido' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _regSenha,
              obscureText: _obscureRegSenha,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Senha',
                hintStyle: const TextStyle(color: Colors.white30),
                prefixIcon: const Icon(Icons.lock_outline, color: Colors.white54),
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscureRegSenha ? Icons.visibility_off : Icons.visibility,
                    color: Colors.white54,
                  ),
                  onPressed: () => setState(() => _obscureRegSenha = !_obscureRegSenha),
                ),
                filled: true,
                fillColor: const Color(0xFF1E293B),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
              validator: (v) => v == null || v.length < 6 ? 'Mínimo 6 caracteres' : null,
            ),
            
            if (_tipoSelecionado.isPrestador) ...[
              const SizedBox(height: 24),
              const Text('Cidades de atuação (AMAUC)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: AmaucConstants.cidades.map((cidade) {
                  final selected = _cidadesSelecionadas.contains(cidade);
                  return ChoiceChip(
                    label: Text(cidade, style: TextStyle(color: selected ? Colors.white : Colors.white70)),
                    selected: selected,
                    selectedColor: const Color(0xFF3B82F6),
                    backgroundColor: const Color(0xFF1E293B),
                    onSelected: (_) {
                      setState(() {
                        selected ? _cidadesSelecionadas.remove(cidade) : _cidadesSelecionadas.add(cidade);
                      });
                      HapticFeedback.selectionClick();
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
              const Text('Categorias de serviço', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: AmaucConstants.categorias.map((cat) {
                  final selected = _categoriasSelecionadas.contains(cat.id);
                  return ChoiceChip(
                    avatar: Icon(cat.icon, size: 16, color: selected ? Colors.white : cat.cor),
                    label: Text(cat.nome, style: TextStyle(color: selected ? Colors.white : Colors.white70)),
                    selected: selected,
                    selectedColor: const Color(0xFF3B82F6),
                    backgroundColor: const Color(0xFF1E293B),
                    onSelected: (_) {
                      setState(() {
                        selected ? _categoriasSelecionadas.remove(cat.id) : _categoriasSelecionadas.add(cat.id);
                      });
                      HapticFeedback.selectionClick();
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
              _buildDarkTextField(
                controller: _regTelefone,
                hint: 'Telefone comercial',
                icon: Icons.phone_outlined,
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 12),
              _buildDarkTextField(
                controller: _regBio,
                hint: 'Bio profissional',
                icon: Icons.description_outlined,
                maxLines: 2,
              ),
            ],
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: loading ? null : _register,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF3B82F6),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: loading
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Criar Conta', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    ).animate().fadeIn();
  }

  // Widget auxiliar para criar inputs escuros rapidamente
  Widget _buildDarkTextField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      maxLines: maxLines,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Colors.white30),
        prefixIcon: Icon(icon, color: Colors.white54),
        filled: true,
        fillColor: const Color(0xFF1E293B),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
      ),
      validator: validator,
    );
  }
}

class _SocialButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _SocialButton({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: Colors.white, size: 24),
            const SizedBox(width: 8),
            Text(
              label,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFF3B82F6).withValues(alpha: 0.2) : const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: selected ? const Color(0xFF3B82F6) : Colors.transparent,
            width: 2,
          ),
        ),
        child: Column(
          children: [
            Icon(icon, size: 32, color: selected ? const Color(0xFF3B82F6) : Colors.white54),
            const SizedBox(height: 12),
            Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
                color: selected ? Colors.white : Colors.white70,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: const TextStyle(fontSize: 11, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}