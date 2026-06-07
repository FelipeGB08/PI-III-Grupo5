import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/amauc_constants.dart';
import '../../../core/theme/app_colors.dart';
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
      SnackBar(content: Text(msg ?? 'Erro ao processar.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authStateProvider);
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 430),
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  const SizedBox(height: 20),
                  _Header(),
                  const SizedBox(height: 32),
                  Container(
                    decoration: BoxDecoration(
                      color: theme.cardTheme.color,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: TabBar(
                      controller: _tabController,
                      indicator: BoxDecoration(
                        gradient: AppColors.amaucGradient,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      indicatorSize: TabBarIndicatorSize.tab,
                      dividerColor: Colors.transparent,
                      labelColor: Colors.black,
                      unselectedLabelColor: theme.hintColor,
                      labelStyle: const TextStyle(fontWeight: FontWeight.w800),
                      padding: const EdgeInsets.all(6),
                      tabs: const [
                        Tab(text: 'Entrar'),
                        Tab(text: 'Cadastrar'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    height: _tipoSelecionado.isPrestador ? 620 : 380,
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
      ),
    );
  }

  Widget _buildLoginForm(bool loading) {
    return Form(
      key: _loginFormKey,
      child: Column(
        children: [
          TextFormField(
            controller: _loginEmail,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(
              hintText: 'E-mail',
              prefixIcon: Icon(Icons.email_outlined),
            ),
            validator: (v) =>
                v == null || !v.contains('@') ? 'E-mail inválido' : null,
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: _loginSenha,
            obscureText: true,
            decoration: const InputDecoration(
              hintText: 'Senha',
              prefixIcon: Icon(Icons.lock_outline),
            ),
            validator: (v) =>
                v == null || v.length < 6 ? 'Mínimo 6 caracteres' : null,
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: loading ? null : _login,
            child: loading
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Entrar'),
          ),
        ],
      ),
    ).animate().fadeIn();
  }

  Widget _buildRegisterForm(bool loading) {
    return Form(
      key: _registerFormKey,
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Escolha seu papel',
                style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _RoleCard(
                    title: 'Quero Contratar',
                    subtitle: 'Cliente',
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
                    title: 'Quero Trabalhar',
                    subtitle: 'Prestador',
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
            const SizedBox(height: 20),
            TextFormField(
              controller: _regNome,
              decoration: const InputDecoration(
                hintText: 'Nome completo',
                prefixIcon: Icon(Icons.person_outline),
              ),
              validator: (v) =>
                  v == null || v.isEmpty ? 'Informe seu nome' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _regEmail,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                hintText: 'E-mail',
                prefixIcon: Icon(Icons.email_outlined),
              ),
              validator: (v) =>
                  v == null || !v.contains('@') ? 'E-mail inválido' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _regSenha,
              obscureText: true,
              decoration: const InputDecoration(
                hintText: 'Senha',
                prefixIcon: Icon(Icons.lock_outline),
              ),
              validator: (v) =>
                  v == null || v.length < 6 ? 'Mínimo 6 caracteres' : null,
            ),
            if (_tipoSelecionado.isPrestador) ...[
              const SizedBox(height: 20),
              Text('Cidades de atuação (AMAUC)',
                  style: Theme.of(context).textTheme.labelLarge),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: AmaucConstants.cidades.map((cidade) {
                  final selected = _cidadesSelecionadas.contains(cidade);
                  return FilterChip(
                    label: Text(cidade),
                    selected: selected,
                    onSelected: (_) {
                      setState(() {
                        if (selected) {
                          _cidadesSelecionadas.remove(cidade);
                        } else {
                          _cidadesSelecionadas.add(cidade);
                        }
                      });
                      HapticFeedback.selectionClick();
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
              Text('Categorias de serviço',
                  style: Theme.of(context).textTheme.labelLarge),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: AmaucConstants.categorias.map((cat) {
                  final selected = _categoriasSelecionadas.contains(cat.id);
                  return FilterChip(
                    avatar: Icon(cat.icon, size: 16, color: cat.cor),
                    label: Text(cat.nome),
                    selected: selected,
                    onSelected: (_) {
                      setState(() {
                        if (selected) {
                          _categoriasSelecionadas.remove(cat.id);
                        } else {
                          _categoriasSelecionadas.add(cat.id);
                        }
                      });
                      HapticFeedback.selectionClick();
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _regTelefone,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  hintText: 'Telefone comercial',
                  prefixIcon: Icon(Icons.phone_outlined),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _regBio,
                maxLines: 2,
                decoration: const InputDecoration(
                  hintText: 'Bio profissional',
                  prefixIcon: Icon(Icons.description_outlined),
                ),
              ),
            ],
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: loading ? null : _register,
              child: loading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Criar Conta'),
            ),
          ],
        ),
      ),
    ).animate().fadeIn();
  }
}

class _Header extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            gradient: AppColors.amaucGradient,
            borderRadius: BorderRadius.circular(22),
          ),
          child: const Icon(Icons.hub_rounded, color: Colors.black, size: 36),
        ).animate().scale(duration: 600.ms, curve: Curves.elasticOut),
        const SizedBox(height: 16),
        Text(
          'Conecta AMAUC',
          style: Theme.of(context).textTheme.headlineLarge,
        ).animate().fadeIn(delay: 200.ms),
        const SizedBox(height: 6),
        Text(
          'Serviços autônomos na região AMAUC',
          style: Theme.of(context).textTheme.bodyMedium,
        ).animate().fadeIn(delay: 300.ms),
      ],
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
          gradient: selected ? AppColors.amaucGradient : null,
          color: selected ? null : Theme.of(context).cardTheme.color,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: selected
                ? Colors.transparent
                : AppColors.primary.withValues(alpha: 0.2),
          ),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.3),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ]
              : null,
        ),
        child: Column(
          children: [
            Icon(icon,
                size: 32, color: selected ? Colors.black : AppColors.primary),
            const SizedBox(height: 8),
            Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 12,
                color: selected ? Colors.black : null,
              ),
            ),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 10,
                color: selected ? Colors.black54 : null,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
