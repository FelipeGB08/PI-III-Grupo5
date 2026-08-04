import 'package:ca_frontend/core/validation/form_validators.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('FormValidators.email', () {
    test('aceita e-mail valido com espacos externos', () {
      expect(FormValidators.email('  pessoa@exemplo.com.br  '), isNull);
    });

    test('rejeita valor vazio e formato invalido', () {
      expect(FormValidators.email(''), isNotNull);
      expect(FormValidators.email('pessoa-sem-dominio'), isNotNull);
    });
  });

  group('FormValidators.password', () {
    test('respeita tamanho minimo padrao e customizado', () {
      expect(FormValidators.password('1234567890'), isNull);
      expect(FormValidators.password('123456789'), isNotNull);
      expect(FormValidators.password('1234567', minLength: 8), isNotNull);
      expect(FormValidators.password(List.filled(40, 'á').join()), isNotNull);
    });
  });

  group('FormValidators.requiredField', () {
    test('rejeita espacos e aceita texto preenchido', () {
      expect(FormValidators.requiredField('   '), isNotNull);
      expect(FormValidators.requiredField('Concordia'), isNull);
    });
  });

  group('FormValidators.name', () {
    test('exige ao menos dois caracteres sem contar espacos', () {
      expect(FormValidators.name(' A '), isNotNull);
      expect(FormValidators.name(' Ana '), isNull);
    });
  });
}
