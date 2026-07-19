const AvaliacaoModel = require('../models/AvaliacaoModel');
const ServicoModel = require('../models/ServicoModel');
const { notificarUsuarioSemBloquear } = require('../services/notificationService');

const AvaliacaoController = {
    criarAvaliacao: async (req, res) => {
        try {
            const cidadaoId = req.usuarioLogado.id;
            const servicoId = Number(req.body.servico_id || req.body.solicitacao_id);
            const notaEstrelas = Number(req.body.nota_estrelas || req.body.nota);

            if (!servicoId || !notaEstrelas) {
                return res.status(400).json({ erro: 'servico_id e nota_estrelas são obrigatórios.' });
            }

            if (notaEstrelas < 1 || notaEstrelas > 5) {
                return res.status(400).json({ erro: 'nota_estrelas deve ser entre 1 e 5.' });
            }

            const servico = await ServicoModel.buscarPorId(servicoId);
            if (!servico) {
                return res.status(404).json({ erro: 'Serviço não encontrado no sistema.' });
            }

            if (servico.cidadao_id !== cidadaoId) {
                return res.status(403).json({
                    erro: 'RF08/RF09 — Fraude detectada: apenas o cidadão contratante pode avaliar este serviço.',
                });
            }

            if (servico.status !== 'concluido') {
                return res.status(403).json({
                    erro: 'RF08/RF09 — Avaliação bloqueada: o serviço precisa estar com status "concluido".',
                });
            }

            const avaliacaoExistente = await AvaliacaoModel.buscarPorServico(servicoId);
            if (avaliacaoExistente) {
                return res.status(400).json({ erro: 'Este serviço já foi avaliado.' });
            }

            const novaAvaliacao = await AvaliacaoModel.criar(
                servicoId,
                notaEstrelas,
                req.body.comentario
            );

            notificarUsuarioSemBloquear({
                usuarioId: servico.prof_id,
                tipo: 'avaliacao_recebida',
                titulo: 'Nova avaliacao recebida',
                corpo: `Voce recebeu ${notaEstrelas} estrela${notaEstrelas > 1 ? 's' : ''} em um servico concluido.`,
                payload: {
                    servico_id: servicoId,
                    avaliacao_id: novaAvaliacao.id,
                    nota_estrelas: notaEstrelas,
                },
            });

            return res.status(201).json({
                mensagem: 'Avaliação registrada!',
                avaliacao: novaAvaliacao,
            });
        } catch (erro) {
            console.error('Erro ao criar avaliação:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    listarDoProfissional: async (req, res) => {
        try {
            const { id } = req.params;
            const query = req.validated?.query || req.query || {};
            const resultado = await AvaliacaoModel.buscarPorProfissional(id, {
                page: query.page,
                pageSize: query.pageSize,
            });
            const mediaResult = await AvaliacaoModel.calcularMedia(id);
            const media = mediaResult ? parseFloat(mediaResult) : 0;
            const { items: avaliacoes, ...paginacao } = resultado;

            return res.status(200).json({
                media,
                avaliacoes,
                ...paginacao,
                paginacao,
            });
        } catch (erro) {
            console.error('Erro ao buscar avaliações:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },
};

module.exports = AvaliacaoController;
