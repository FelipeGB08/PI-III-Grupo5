import 'package:ca_frontend/domain/entities/avaliacao.dart';
import 'package:ca_frontend/domain/entities/chamado.dart';
import 'package:ca_frontend/domain/entities/prestador.dart';
import 'package:ca_frontend/domain/entities/user.dart';
import 'package:ca_frontend/domain/repositories/auth_repository.dart';
import 'package:ca_frontend/domain/repositories/avaliacao_repository.dart';
import 'package:ca_frontend/domain/repositories/chamado_repository.dart';
import 'package:ca_frontend/domain/repositories/prestador_repository.dart';

class FakeAuthRepository implements AuthRepository {
  FakeAuthRepository(this.user);

  User user;
  String? loginEmail;
  String? loginSenha;
  String? deleteAccountConfirmation;

  AuthResult get _result => AuthResult(token: 'fake-token', user: user);

  @override
  Future<AuthResult> login(
      {required String email, required String senha}) async {
    loginEmail = email;
    loginSenha = senha;
    return _result;
  }

  @override
  Future<AuthResult> register(RegisterParams params) async => _result;

  @override
  Future<AuthResult> socialLogin({
    required String provider,
    required String token,
    required String cidadeAmauc,
    String? platform,
    String? state,
    String? nonce,
  }) async =>
      _result;

  @override
  Future<AuthResult> concluirGithubOAuth({
    required String ticket,
    required String state,
  }) async =>
      _result;

  @override
  Future<AuthResult> refreshSession() async => _result;

  @override
  Future<String?> getToken() async => null;

  @override
  Future<User?> getCurrentUser() async => user;

  @override
  Future<void> logout() async {}

  @override
  Future<void> saveSession(AuthResult result) async {
    user = result.user;
  }

  @override
  Future<void> persistUser(User user) async {
    this.user = user;
  }

  @override
  Future<User> refreshProfile() async => user;

  @override
  Future<User> updateProfile({
    String? nome,
    String? telefone,
    String? enderecoPrincipal,
    double? latitude,
    double? longitude,
    String? fotoUrl,
  }) async {
    user = user.copyWith(
      nome: nome,
      telefone: telefone,
      enderecoPrincipal: enderecoPrincipal,
      latitude: latitude,
      longitude: longitude,
      fotoUrl: fotoUrl,
    );
    return user;
  }

  @override
  Future<String?> requestMagicLink({required String email}) async => null;

  @override
  Future<AuthResult> verifyMagicLink({required String token}) async => _result;

  @override
  Future<String?> requestPasswordReset({required String email}) async => null;

  @override
  Future<void> confirmPasswordReset({
    required String token,
    required String senha,
  }) async {}

  @override
  Future<void> deleteAccount({required String confirmation}) async {
    deleteAccountConfirmation = confirmation;
  }

  @override
  Future<String> uploadAvatar(String filePath) async => 'fake-avatar.png';

  @override
  Future<String> uploadAvatarBytes({
    required List<int> bytes,
    required String filename,
  }) async =>
      'fake-avatar.png';
}

class FakePrestadorRepository implements PrestadorRepository {
  FakePrestadorRepository(this.prestadores);

  final List<Prestador> prestadores;
  String? lastCategoria;
  double? lastPrecoMinimo;
  double? lastPrecoMaximo;
  double? lastNotaMinima;
  DateTime? lastDisponivelEm;
  int listarCalls = 0;

  @override
  Future<List<Prestador>> listar({
    String? cidade,
    String? categoria,
    double? lat,
    double? lng,
    double? raioKm,
    double? precoMinimo,
    double? precoMaximo,
    double? notaMinima,
    DateTime? disponivelEm,
  }) async {
    listarCalls++;
    lastCategoria = categoria;
    lastPrecoMinimo = precoMinimo;
    lastPrecoMaximo = precoMaximo;
    lastNotaMinima = notaMinima;
    lastDisponivelEm = disponivelEm;
    return prestadores;
  }

  @override
  Future<Prestador?> buscarPorId(int id) async {
    for (final prestador in prestadores) {
      if (prestador.id == id) return prestador;
    }
    return null;
  }
}

class FakeChamadoRepository implements ChamadoRepository {
  FakeChamadoRepository([List<Chamado> initial = const []])
      : chamados = List<Chamado>.from(initial);

  final List<Chamado> chamados;
  Chamado? createdChamado;
  ChamadoStatus? lastStatus;
  bool? lastListWasForPrestador;

  @override
  Future<Chamado> criar({
    required int profissionalId,
    required String descricao,
    int? agendaServicoId,
    String? servicoNome,
    double? preco,
    DateTime? agendadoPara,
    String? enderecoAtendimento,
    double? atendimentoLatitude,
    double? atendimentoLongitude,
    String? fotoUrl,
    String? categoria,
  }) async {
    final chamado = Chamado(
      id: chamados.length + 100,
      descricao: descricao,
      status: ChamadoStatus.pendente,
      profissionalId: profissionalId,
      profissionalNome: 'Profissional Fake',
      preco: preco,
      servicoNome: servicoNome,
      agendadoPara: agendadoPara?.toIso8601String(),
      enderecoAtendimento: enderecoAtendimento,
      atendimentoLatitude: atendimentoLatitude,
      atendimentoLongitude: atendimentoLongitude,
      fotoUrl: fotoUrl,
    );
    createdChamado = chamado;
    chamados.add(chamado);
    return chamado;
  }

  @override
  Future<PaginaChamados> listarMeusChamados({
    bool isPrestador = false,
    int page = 1,
    int pageSize = 20,
  }) async {
    lastListWasForPrestador = isPrestador;
    final start = (page - 1) * pageSize;
    final items = start >= chamados.length
        ? const <Chamado>[]
        : chamados.skip(start).take(pageSize).toList();
    final totalPages =
        chamados.isEmpty ? 0 : (chamados.length / pageSize).ceil();
    return PaginaChamados(
      items: items,
      total: chamados.length,
      page: page,
      pageSize: pageSize,
      totalPages: totalPages,
      hasMore: page < totalPages,
    );
  }

  @override
  Future<Chamado> buscarPorId(int chamadoId) async => _find(chamadoId);

  @override
  Future<Chamado> atualizarStatus({
    required int chamadoId,
    required ChamadoStatus status,
  }) async {
    lastStatus = status;
    final statusRetornado = status == ChamadoStatus.concluido
        ? ChamadoStatus.aguardandoConfirmacaoCliente
        : status;
    return _replace(_find(chamadoId).copyWith(status: statusRetornado));
  }

  @override
  Future<Chamado> confirmarConclusao({required int chamadoId}) async {
    return _replace(
      _find(chamadoId).copyWith(
        status: ChamadoStatus.concluido,
        conclusaoConfirmadaEm: DateTime.now().toIso8601String(),
      ),
    );
  }

  @override
  Future<Chamado> uploadFotosConclusao({
    required int chamadoId,
    required List<String> filePaths,
  }) async {
    return _replace(
      _find(chamadoId).copyWith(fotosConclusao: List<String>.from(filePaths)),
    );
  }

  @override
  Future<Chamado> cancelarSolicitacao({
    required int chamadoId,
    String? motivo,
  }) async {
    return atualizarStatus(
      chamadoId: chamadoId,
      status: ChamadoStatus.cancelado,
    );
  }

  @override
  Future<Chamado> solicitarRemarcacao({
    required int chamadoId,
    required DateTime novaDataHora,
    String? motivo,
  }) async {
    return atualizarStatus(
      chamadoId: chamadoId,
      status: ChamadoStatus.remarcacaoSolicitada,
    );
  }

  @override
  Future<Chamado> aceitarRemarcacao({required int chamadoId}) async {
    return atualizarStatus(
      chamadoId: chamadoId,
      status: ChamadoStatus.emAndamento,
    );
  }

  @override
  Future<Chamado> recusarRemarcacao({required int chamadoId}) async {
    return atualizarStatus(
      chamadoId: chamadoId,
      status: ChamadoStatus.recusado,
    );
  }

  @override
  Future<Chamado> proporValor({
    required int chamadoId,
    required double preco,
    String? motivo,
  }) async {
    return _replace(
      _find(chamadoId).copyWith(
        status: ChamadoStatus.propostaValor,
        precoProposto: preco,
      ),
    );
  }

  @override
  Future<Chamado> aceitarPropostaValor({required int chamadoId}) async {
    return atualizarStatus(
      chamadoId: chamadoId,
      status: ChamadoStatus.emAndamento,
    );
  }

  @override
  Future<Chamado> recusarPropostaValor({required int chamadoId}) async {
    return atualizarStatus(
      chamadoId: chamadoId,
      status: ChamadoStatus.recusado,
    );
  }

  Chamado _find(int id) => chamados.firstWhere((item) => item.id == id);

  Chamado _replace(Chamado chamado) {
    final index = chamados.indexWhere((item) => item.id == chamado.id);
    chamados[index] = chamado;
    return chamado;
  }
}

class FakeAvaliacaoRepository implements AvaliacaoRepository {
  int? solicitacaoId;
  int? profissionalId;
  int? nota;
  String? comentario;

  @override
  Future<void> criar({
    required int solicitacaoId,
    required int profissionalId,
    required int nota,
    String? comentario,
  }) async {
    this.solicitacaoId = solicitacaoId;
    this.profissionalId = profissionalId;
    this.nota = nota;
    this.comentario = comentario;
  }

  @override
  Future<AvaliacoesResumo> listarDoProfissional(
    int profissionalId, {
    int page = 1,
    int pageSize = 20,
  }) async {
    return const AvaliacoesResumo(media: 0, avaliacoes: []);
  }
}
