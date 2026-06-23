const path = require('path');
const ServicoModel = require('../models/ServicoModel');
const UserModel = require('../models/UserModel');

function montarUrlFoto(req, fotoUrl) {
    if (!fotoUrl) return null;
    if (fotoUrl.startsWith('http://') || fotoUrl.startsWith('https://')) {
        return fotoUrl;
    }
    return `${req.protocol}://${req.get('host')}/uploads/${path.basename(fotoUrl)}`;
}

function normalizarStatusLegado(status) {
    const mapa = {
        em_andamento: 'aceito',
        aceito: 'aceito',
        pendente: 'pendente',
        recusado: 'recusado',
        concluido: 'concluido',
    };
    return mapa[status] || status;
}

function formatarServicoResposta(servico) {
    if (!servico) return servico;
    return {
        ...servico,
        profissional_id: servico.prof_id,
        data_solicitacao: servico.criado_em,
    };
}

const ServicoController = {
    criarSolicitacao: async (req, res) => ServicoController.criarServico(req, res),

    criarServico: async (req, res) => {
        try {
            const cidadaoId = req.usuarioLogado.id;
            const profId = Number(req.body.prof_id || req.body.profissional_id);
            const descricao = req.body.descricao;
            const preco = req.body.preco !== undefined && req.body.preco !== ''
                ? Number(req.body.preco)
                : null;
            const agendaServicoId = req.body.agenda_servico_id || req.body.agendaServicoId;
            const servicoNome = String(req.body.servico_nome || req.body.servicoNome || '').trim();
            const enderecoAtendimento = String(req.body.endereco_atendimento || req.body.enderecoAtendimento || '').trim();
            const agendadoPara = req.body.agendado_para || req.body.agendadoPara || null;

            if (!profId || !descricao || descricao.trim() === '') {
                return res.status(400).json({
                    erro: 'prof_id e descricao são obrigatórios para solicitar orçamento.',
                });
            }

            if (preco !== null && (Number.isNaN(preco) || preco <= 0)) {
                return res.status(400).json({ erro: 'Preco do servico invalido.' });
            }

            if (cidadaoId === profId) {
                return res.status(400).json({ erro: 'Você não pode solicitar serviços para si mesmo.' });
            }

            const profissional = await UserModel.buscarPorId(profId);
            if (!profissional || profissional.perfil_tipo !== 'profissional') {
                return res.status(404).json({ erro: 'Profissional não encontrado.' });
            }

            const fotoUrl = req.file ? montarUrlFoto(req, req.file.filename) : null;
            const novoServico = await ServicoModel.criar(cidadaoId, profId, descricao.trim(), fotoUrl, {
                agenda_servico_id: agendaServicoId ? Number(agendaServicoId) : null,
                servico_nome: servicoNome || null,
                endereco_atendimento: enderecoAtendimento || null,
                agendado_para: agendadoPara,
                preco,
            });

            return res.status(201).json({
                mensagem: 'Orçamento solicitado com sucesso!',
                servico: formatarServicoResposta(novoServico),
                solicitacao: formatarServicoResposta(novoServico),
            });
        } catch (erro) {
            console.error('Erro ao criar serviço:', erro);
            return res.status(500).json({ erro: 'Falha interna ao processar solicitação de orçamento.' });
        }
    },

    atualizarStatus: async (req, res) => {
        try {
            const profId = req.usuarioLogado.id;
            const { id } = req.params;
            const status = normalizarStatusLegado(req.body.status);
            const preco = req.body.preco !== undefined && req.body.preco !== ''
                ? Number(req.body.preco)
                : null;

            const statusPermitidos = ['aceito', 'recusado', 'concluido'];
            if (!status || !statusPermitidos.includes(status)) {
                return res.status(400).json({
                    erro: 'Status invalido. Use: aceito, recusado ou concluido.',
                });
            }

            if (preco !== null && (Number.isNaN(preco) || preco <= 0)) {
                return res.status(400).json({
                    erro: 'O preco proposto deve ser maior que zero.',
                });
            }

            const servicoAtual = await ServicoModel.buscarPorId(id);
            if (!servicoAtual || Number(servicoAtual.prof_id) !== profId) {
                return res.status(404).json({ erro: 'ServiÃ§o nÃ£o encontrado ou acesso negado.' });
            }

            const transicoesPermitidas = {
                pendente: ['aceito', 'recusado'],
                aceito: ['concluido'],
                recusado: [],
                concluido: [],
            };

            if (!transicoesPermitidas[servicoAtual.status]?.includes(status)) {
                return res.status(400).json({
                    erro: `TransiÃ§Ã£o invÃ¡lida: serviÃ§o ${servicoAtual.status} nÃ£o pode ir para ${status}.`,
                });
            }

            const servicoAtualizado = await ServicoModel.atualizarStatus(
                id,
                profId,
                status,
                status === 'aceito' ? preco : preco
            );

            if (!servicoAtualizado) {
                return res.status(404).json({ erro: 'Serviço não encontrado ou acesso negado.' });
            }

            return res.status(200).json({
                mensagem: 'Status do serviço atualizado com sucesso!',
                servico: formatarServicoResposta(servicoAtualizado),
                solicitacao: formatarServicoResposta(servicoAtualizado),
            });
        } catch (erro) {
            console.error('Erro na atualização de status:', erro);
            return res.status(500).json({ erro: 'Erro interno ao processar atualização.' });
        }
    },

    listarMeusPedidos: async (req, res) => {
        try {
            const profId = req.usuarioLogado.id;
            const { status } = req.query;
            const pedidos = await ServicoModel.buscarPorProfissional(profId, status || null);
            return res.status(200).json(pedidos.map(formatarServicoResposta));
        } catch (erro) {
            console.error('Erro ao listar pedidos do profissional:', erro);
            return res.status(500).json({ erro: 'Erro ao recuperar pedidos.' });
        }
    },

    listarMinhasSolicitacoes: async (req, res) => {
        try {
            const cidadaoId = req.usuarioLogado.id;
            const { status } = req.query;
            const pedidos = await ServicoModel.buscarPorCidadao(cidadaoId, status || null);
            return res.status(200).json(pedidos.map(formatarServicoResposta));
        } catch (erro) {
            console.error('Erro ao listar solicitações do cidadão:', erro);
            return res.status(500).json({ erro: 'Erro ao recuperar solicitações.' });
        }
    },
};

module.exports = ServicoController;
