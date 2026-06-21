/// Validadores compartilhados para formulários de autenticação.
class FormValidators {
  FormValidators._();

  static final _emailRegex = RegExp(
    r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
  );

  static String? email(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Informe seu e-mail';
    }
    if (!_emailRegex.hasMatch(value.trim())) {
      return 'E-mail inválido';
    }
    return null;
  }

  static String? password(String? value, {int minLength = 6}) {
    if (value == null || value.isEmpty) {
      return 'Informe sua senha';
    }
    if (value.length < minLength) {
      return 'Mínimo $minLength caracteres';
    }
    return null;
  }

  static String? requiredField(String? value, {String fieldName = 'Este campo'}) {
    if (value == null || value.trim().isEmpty) {
      return '$fieldName é obrigatório';
    }
    return null;
  }

  static String? name(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Informe seu nome';
    }
    if (value.trim().length < 2) {
      return 'Nome deve ter ao menos 2 caracteres';
    }
    return null;
  }
}
