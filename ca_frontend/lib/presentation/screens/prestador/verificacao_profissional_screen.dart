import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_colors.dart';
import '../../providers/providers.dart';

class VerificacaoProfissionalScreen extends ConsumerStatefulWidget {
  const VerificacaoProfissionalScreen({super.key});

  @override
  ConsumerState<VerificacaoProfissionalScreen> createState() =>
      _VerificacaoProfissionalScreenState();
}

class _VerificacaoProfissionalScreenState
    extends ConsumerState<VerificacaoProfissionalScreen> {
  final _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(verificacaoProvider.notifier).carregar();
    });
  }

  Future<void> _selecionarDocumento() async {
    final arquivo = await _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 90,
      maxWidth: 2048,
    );
    if (arquivo == null) return;

    final notifier = ref.read(verificacaoProvider.notifier);
    final enviado = kIsWeb
        ? await notifier.enviarBytes(await arquivo.readAsBytes(), arquivo.name)
        : await notifier.enviarArquivo(arquivo.path);
    if (!mounted) return;

    final mensagem = enviado
        ? 'Documento enviado. Aguarde a revisao de um administrador.'
        : ref.read(verificacaoProvider).error ??
            'Nao foi possivel enviar o documento.';
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(mensagem)));
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(verificacaoProvider);
    final verificacao = state.verificacao;
    final status =
        verificacao?['status_verificacao']?.toString() ?? 'nao_enviado';
    final podeEnviar = status != 'pendente' && !state.isSending;

    return Scaffold(
      appBar: AppBar(title: const Text('Verificacao do perfil')),
      body: RefreshIndicator(
        onRefresh: () => ref.read(verificacaoProvider.notifier).carregar(),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
          children: [
            Text(
              'Selo de profissional verificado',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Envie uma foto nítida de documento de identificação ou comprovante. '
              'O arquivo é privado e será visto somente por você e por administradores.',
            ),
            const SizedBox(height: 24),
            if (state.isLoading)
              const Center(child: CircularProgressIndicator())
            else ...[
              _StatusCard(
                status: status,
                motivoRejeicao: verificacao?['motivo_rejeicao']?.toString(),
                enviadoEm: verificacao?['enviado_em']?.toString(),
              ),
              if (state.error != null) ...[
                const SizedBox(height: 14),
                Text(
                  state.error!,
                  style: const TextStyle(color: AppColors.statusRecusado),
                ),
              ],
              const SizedBox(height: 20),
              Semantics(
                button: true,
                label: 'Selecionar documento para verificacao',
                hint: status == 'pendente'
                    ? 'Ha um documento aguardando revisao'
                    : 'Abre a galeria para escolher uma imagem do documento',
                child: FilledButton.icon(
                  key: const Key('enviar-documento-verificacao'),
                  onPressed: podeEnviar ? _selecionarDocumento : null,
                  icon: state.isSending
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.upload_file_rounded),
                  label: Text(
                    status == 'rejeitado'
                        ? 'Enviar novo documento'
                        : status == 'pendente'
                            ? 'Documento em revisao'
                            : 'Selecionar documento',
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Formatos aceitos: JPEG, PNG ou WEBP. Tamanho máximo: 5 MB.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _StatusCard extends StatelessWidget {
  const _StatusCard({
    required this.status,
    this.motivoRejeicao,
    this.enviadoEm,
  });

  final String status;
  final String? motivoRejeicao;
  final String? enviadoEm;

  @override
  Widget build(BuildContext context) {
    final dados = switch (status) {
      'pendente' => (
          titulo: 'Aguardando revisao',
          descricao:
              'Seu documento foi recebido e sera analisado por um administrador.',
          icone: Icons.pending_actions_rounded,
          cor: AppColors.statusPendente,
        ),
      'aprovado' => (
          titulo: 'Perfil verificado',
          descricao:
              'Seu selo de profissional verificado ja esta visivel para clientes.',
          icone: Icons.verified_rounded,
          cor: AppColors.accent,
        ),
      'rejeitado' => (
          titulo: 'Documento precisa de revisao',
          descricao: motivoRejeicao?.isNotEmpty == true
              ? motivoRejeicao!
              : 'Envie uma nova imagem nítida do documento.',
          icone: Icons.error_outline_rounded,
          cor: AppColors.statusRecusado,
        ),
      _ => (
          titulo: 'Verificacao nao enviada',
          descricao:
              'Envie um documento para solicitar o selo de profissional verificado.',
          icone: Icons.badge_outlined,
          cor: AppColors.muted,
        ),
    };

    return Semantics(
      label: 'Status da verificacao: ${dados.titulo}. ${dados.descricao}',
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          color: dados.cor.withValues(alpha: 0.10),
          border: Border.all(color: dados.cor.withValues(alpha: 0.45)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(dados.icone, color: dados.cor, size: 28),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    dados.titulo,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                  const SizedBox(height: 5),
                  Text(dados.descricao),
                  if (enviadoEm?.isNotEmpty == true) ...[
                    const SizedBox(height: 6),
                    Text(
                      'Enviado em: ${enviadoEm!}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
