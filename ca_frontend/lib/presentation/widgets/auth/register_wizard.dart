import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';

import '../../../core/config/amauc_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/validation/form_validators.dart';
import '../../../domain/entities/user.dart';
import 'auth_text_field.dart';
import 'captcha_placeholder.dart';
import 'legal_consent_checkbox.dart';
import 'password_strength_meter.dart';
import 'step_progress.dart';

/// Wizard multi-etapas para cadastro enterprise.
class RegisterWizard extends StatefulWidget {
  const RegisterWizard({
    super.key,
    required this.formKey,
    required this.loading,
    required this.onRegister,
    required this.tipoSelecionado,
    required this.onTipoChanged,
    required this.nomeController,
    required this.emailController,
    required this.senhaController,
    required this.telefoneController,
    required this.enderecoController,
    required this.bioController,
    required this.cidadesSelecionadas,
    required this.categoriasSelecionadas,
    required this.onLocationChanged,
    required this.onCidadesChanged,
    required this.onCategoriasChanged,
  });

  final GlobalKey<FormState> formKey;
  final bool loading;
  final Future<void> Function() onRegister;
  final UserTipo tipoSelecionado;
  final ValueChanged<UserTipo> onTipoChanged;
  final TextEditingController nomeController;
  final TextEditingController emailController;
  final TextEditingController senhaController;
  final TextEditingController telefoneController;
  final TextEditingController enderecoController;
  final TextEditingController bioController;
  final Set<String> cidadesSelecionadas;
  final Set<String> categoriasSelecionadas;
  final void Function(double lat, double lng) onLocationChanged;
  final VoidCallback onCidadesChanged;
  final VoidCallback onCategoriasChanged;

  @override
  State<RegisterWizard> createState() => _RegisterWizardState();
}

class _RegisterWizardState extends State<RegisterWizard> {
  static const _stepLabels = ['Credenciais', 'Perfil'];

  int _currentStep = 0;
  bool _obscureSenha = true;
  bool _acceptedLegal = false;
  bool _captchaVerified = false;
  String? _legalError;
  String? _captchaError;
  String? _chipsError;
  bool _locationCaptured = false;
  bool _capturingLocation = false;
  DateTime? _lastStepTap;

  String? get _cidadeSelecionada => widget.cidadesSelecionadas.isEmpty
      ? null
      : widget.cidadesSelecionadas.first;

  Future<void> _showLegalDialog({
    required String title,
    required String body,
  }) {
    return showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: SingleChildScrollView(child: Text(body)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Fechar'),
          ),
        ],
      ),
    );
  }

  bool _validateStep(int step) {
    final form = widget.formKey.currentState;
    if (form == null) return false;

    switch (step) {
      case 0:
        return form.validate();
      case 1:
        var isValid = form.validate();

        if (widget.cidadesSelecionadas.isEmpty) {
          setState(() {
            _chipsError = 'Selecione sua cidade AMAUC.';
          });
          isValid = false;
        } else if (widget.tipoSelecionado.isPrestador) {
          if (widget.categoriasSelecionadas.isEmpty) {
            setState(() {
              _chipsError = 'Selecione ao menos uma categoria de serviço.';
            });
            isValid = false;
          } else {
            setState(() => _chipsError = null);
          }
        } else {
          setState(() => _chipsError = null);
        }

        if (!_acceptedLegal) {
          setState(() {
            _legalError =
                'Você precisa aceitar os Termos e a Política de Privacidade.';
          });
          isValid = false;
        } else {
          setState(() => _legalError = null);
        }

        if (!_captchaVerified) {
          setState(() {
            _captchaError =
                'Complete a verificação anti-bot antes de continuar.';
          });
          isValid = false;
        } else {
          setState(() => _captchaError = null);
        }

        return isValid && form.validate();
      default:
        return false;
    }
  }

  void _nextStep() {
    final now = DateTime.now();
    if (_lastStepTap != null &&
        now.difference(_lastStepTap!) < const Duration(milliseconds: 400)) {
      return;
    }
    _lastStepTap = now;

    if (!_validateStep(_currentStep)) return;

    setState(() => _currentStep = 1);
  }

  void _previousStep() {
    setState(() => _currentStep = 0);
  }

  Future<void> _submit() async {
    if (widget.loading) return;

    final now = DateTime.now();
    if (_lastStepTap != null &&
        now.difference(_lastStepTap!) < const Duration(milliseconds: 800)) {
      return;
    }
    _lastStepTap = now;

    if (!_validateStep(1)) return;

    await widget.onRegister();
  }

  Future<void> _captureLocation() async {
    if (_capturingLocation) return;
    setState(() => _capturingLocation = true);
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Permita a localização para salvar o ponto exato.'),
          ),
        );
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
      widget.onLocationChanged(position.latitude, position.longitude);
      if (!mounted) return;
      setState(() => _locationCaptured = true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Localização capturada com sucesso.')),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Não foi possível capturar sua localização agora.'),
        ),
      );
    } finally {
      if (mounted) setState(() => _capturingLocation = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: widget.formKey,
      autovalidateMode: AutovalidateMode.onUserInteraction,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          StepProgress(
            currentStep: _currentStep,
            totalSteps: _stepLabels.length,
            labels: _stepLabels,
          ),
          const SizedBox(height: 28),
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            child: _currentStep == 0
                ? _buildCredentialsStep(key: const ValueKey('step-0'))
                : _buildProfileStep(key: const ValueKey('step-1')),
          ),
          const SizedBox(height: 24),
          _buildNavigationButtons(),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildCredentialsStep({Key? key}) {
    return Column(
      key: key,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Passo 1: Credenciais rápidas',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          'Escolha seu perfil e defina e-mail e senha de acesso.',
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.5),
            fontSize: 13,
          ),
        ),
        const SizedBox(height: 20),
        Row(
          children: [
            Expanded(
              child: _RoleCard(
                title: 'Cliente',
                subtitle: 'Quero Contratar',
                icon: Icons.search_rounded,
                selected: widget.tipoSelecionado.isCliente,
                onTap: () {
                  widget.onTipoChanged(UserTipo.cidadao);
                  HapticFeedback.lightImpact();
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _RoleCard(
                title: 'Prestador',
                subtitle: 'Quero Trabalhar',
                icon: Icons.handyman_rounded,
                selected: widget.tipoSelecionado.isPrestador,
                onTap: () {
                  widget.onTipoChanged(UserTipo.profissional);
                  HapticFeedback.lightImpact();
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
        AuthTextField(
          controller: widget.emailController,
          label: 'E-mail',
          hint: 'seu@email.com',
          icon: Icons.email_outlined,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          validator: FormValidators.email,
        ),
        const SizedBox(height: 16),
        AuthTextField(
          controller: widget.senhaController,
          label: 'Senha',
          hint: '••••••••',
          icon: Icons.lock_outline,
          obscureText: _obscureSenha,
          textInputAction: TextInputAction.done,
          suffixIcon: PasswordVisibilityToggle(
            obscure: _obscureSenha,
            onToggle: () => setState(() => _obscureSenha = !_obscureSenha),
          ),
          validator: FormValidators.password,
          onChanged: (_) => setState(() {}),
        ),
        PasswordStrengthMeter(password: widget.senhaController.text),
      ],
    );
  }

  Widget _buildProfileStep({Key? key}) {
    return Column(
      key: key,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Passo 2: Dados de perfil',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          'Complete suas informações e confirme o consentimento legal.',
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.5),
            fontSize: 13,
          ),
        ),
        const SizedBox(height: 20),
        AuthTextField(
          controller: widget.nomeController,
          label: 'Nome completo',
          hint: 'Seu nome',
          icon: Icons.person_outline,
          textInputAction: TextInputAction.next,
          validator: FormValidators.name,
        ),
        const SizedBox(height: 20),
        const Text(
          'Cidade AMAUC',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 13,
          ),
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          initialValue: _cidadeSelecionada,
          dropdownColor: const Color(0xFF1E293B),
          decoration: InputDecoration(
            filled: true,
            fillColor: const Color(0xFF1E293B),
            prefixIcon: const Icon(Icons.location_city_outlined),
            hintText: 'Selecione sua cidade',
            hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.45)),
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
          onChanged: (cidade) {
            if (cidade == null) return;
            setState(() {
              widget.cidadesSelecionadas
                ..clear()
                ..add(cidade);
              _chipsError = null;
            });
            widget.onCidadesChanged();
          },
          validator: (_) {
            return widget.cidadesSelecionadas.isEmpty
                ? 'Selecione sua cidade AMAUC.'
                : null;
          },
        ),
        const SizedBox(height: 16),
        AuthTextField(
          controller: widget.enderecoController,
          label: 'Endereço principal',
          hint: 'Rua, número, bairro',
          icon: Icons.home_outlined,
          textInputAction: TextInputAction.next,
        ),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: _capturingLocation ? null : _captureLocation,
          icon: _capturingLocation
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Icon(
                  _locationCaptured
                      ? Icons.my_location_rounded
                      : Icons.location_searching_rounded,
                ),
          label: Text(
            _locationCaptured
                ? 'Localização exata capturada'
                : 'Usar minha localização atual',
          ),
        ),
        if (widget.tipoSelecionado.isPrestador) ...[
          const SizedBox(height: 20),
          const Text(
            'Categorias de serviço',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: AmaucConstants.categorias.map((cat) {
              final selected = widget.categoriasSelecionadas.contains(cat.id);
              return ChoiceChip(
                avatar: Icon(
                  cat.icon,
                  size: 16,
                  color: selected ? AppColors.actionForeground : cat.cor,
                ),
                label: Text(
                  cat.nome,
                  style: TextStyle(
                    color:
                        selected ? AppColors.actionForeground : Colors.white70,
                    fontSize: 12,
                  ),
                ),
                selected: selected,
                selectedColor: const Color(0xFF3B82F6),
                backgroundColor: const Color(0xFF1E293B),
                onSelected: (_) {
                  setState(() {
                    if (selected) {
                      widget.categoriasSelecionadas.remove(cat.id);
                    } else {
                      widget.categoriasSelecionadas.add(cat.id);
                    }
                    _chipsError = null;
                  });
                  widget.onCategoriasChanged();
                  HapticFeedback.selectionClick();
                },
              );
            }).toList(),
          ),
          if (_chipsError != null) ...[
            const SizedBox(height: 8),
            Text(
              _chipsError!,
              style: const TextStyle(color: Color(0xFFEF4444), fontSize: 12),
            ),
          ],
          const SizedBox(height: 16),
          AuthTextField(
            controller: widget.telefoneController,
            label: 'Telefone comercial',
            hint: '(49) 99999-9999',
            icon: Icons.phone_outlined,
            keyboardType: TextInputType.phone,
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: 16),
          AuthTextField(
            controller: widget.bioController,
            label: 'Bio profissional',
            hint: 'Descreva sua experiência',
            icon: Icons.description_outlined,
            maxLines: 2,
            textInputAction: TextInputAction.done,
          ),
        ],
        const SizedBox(height: 24),
        LegalConsentCheckbox(
          value: _acceptedLegal,
          errorText: _legalError,
          onChanged: (value) {
            setState(() {
              _acceptedLegal = value ?? false;
              _legalError = null;
            });
          },
          onTermsTap: () {
            _showLegalDialog(
              title: 'Termos de Uso',
              body: 'Ao usar o Conecta AMAUC, voce declara que as informacoes '
                  'fornecidas sao verdadeiras e concorda em utilizar a '
                  'plataforma apenas para solicitar ou oferecer servicos reais '
                  'na regiao da AMAUC. Solicitacoes falsas, dados incorretos, '
                  'uso abusivo ou tentativa de fraude podem causar bloqueio da '
                  'conta. Valores, prazos e execucao do servico devem ser '
                  'confirmados entre cliente e profissional.',
            );
          },
          onPrivacyTap: () {
            _showLegalDialog(
              title: 'Politica de Privacidade',
              body: 'O Conecta AMAUC utiliza nome, e-mail, telefone, cidade, '
                  'perfil de usuario e dados de agendamento para autenticar '
                  'usuarios, exibir profissionais, registrar solicitacoes e '
                  'enviar notificacoes. Fotos enviadas pelo usuario sao usadas '
                  'apenas para perfil ou detalhes do atendimento. Os dados não '
                  'devem ser vendidos e podem ser revisados pela equipe do '
                  'projeto para suporte, seguranca e demonstracao academica.',
            );
          },
        ),
        const SizedBox(height: 16),
        CaptchaPlaceholder(
          onVerifiedChanged: (verified) {
            setState(() {
              _captchaVerified = verified;
              _captchaError = null;
            });
          },
        ),
        if (_captchaError != null) ...[
          const SizedBox(height: 6),
          Text(
            _captchaError!,
            style: const TextStyle(color: Color(0xFFEF4444), fontSize: 12),
          ),
        ],
      ],
    );
  }

  Widget _buildNavigationButtons() {
    final isLastStep = _currentStep == _stepLabels.length - 1;

    return Row(
      children: [
        if (_currentStep > 0)
          Expanded(
            child: OutlinedButton(
              onPressed: widget.loading ? null : _previousStep,
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.white70,
                side: BorderSide(color: Colors.white.withValues(alpha: 0.2)),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text('Voltar'),
            ),
          ),
        if (_currentStep > 0) const SizedBox(width: 12),
        Expanded(
          flex: _currentStep > 0 ? 2 : 1,
          child: ElevatedButton(
            onPressed: widget.loading
                ? null
                : isLastStep
                    ? _submit
                    : _nextStep,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF3B82F6),
              foregroundColor: AppColors.actionForeground,
              disabledBackgroundColor:
                  const Color(0xFF3B82F6).withValues(alpha: 0.5),
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: widget.loading
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.actionForeground,
                    ),
                  )
                : Text(
                    isLastStep ? 'Criar Conta' : 'Continuar',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.actionForeground,
                    ),
                  ),
          ),
        ),
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
    return Semantics(
      button: true,
      selected: selected,
      label: '$title: $subtitle',
      onTap: onTap,
      child: GestureDetector(
        onTap: onTap,
        child: ExcludeSemantics(
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: selected
                  ? const Color(0xFF3B82F6).withValues(alpha: 0.2)
                  : const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: selected ? const Color(0xFF3B82F6) : Colors.transparent,
                width: 2,
              ),
            ),
            child: Column(
              children: [
                Icon(
                  icon,
                  size: 32,
                  color: selected ? const Color(0xFF3B82F6) : Colors.white54,
                ),
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
        ),
      ),
    );
  }
}
