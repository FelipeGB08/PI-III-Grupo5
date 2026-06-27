const ServicoModel = require('../models/ServicoModel');
const UserModel = require('../models/UserModel');

const normalizarTexto = (valor) => {
    if (valor === undefined || valor === null) {
        return '';
    }

    return String(valor).trim();
};

const obterIdUsuarioLogado = (req) => {
    return req.usuarioLogado?.id || req.usuario?.id || req.user?.id;
};

const SolicitacaoController = {
    criarSolicitacao: async (req, res) => {
        try {
            const cidadaoId = obterIdUsuarioLogado(req);

            const profId = Number(
                req.body.prof_id ||
                req.body.profissional_id ||
                req.body.prestador_id
            );

            const descricao = normalizarTexto(req.body.descricao);
            const enderecoAtendimento = normalizarTexto(
                req.body.endereco_atendimento || req.body.enderecoAtendimento
            );

            const agendaServicoId = req.body.agenda_servico_id
                ? Number(req.body.agenda_servico_id)
                : null;

            const agendadoPara =
                req.body.agendado_para ||
                req.body.agendadoPara ||
                req.body.data_hora ||
                null;

            const servicoNome = normalizarTexto(
                req.body.servico_nome ||
                req.body.servico ||
                req.body.nome_servico
            );

            const preco = req.body.preco !== undefined && req.body.preco !== ''
                ? Number(req.body.preco)
                : null;

            if (!cidadaoId) {
                return res.status(401).json({
                    erro: 'Usuário não autenticado.',
                });
            }

            if (!profId) {
                return res.status(400).json({
                    erro: 'Informe o profissional da solicitação.',
                });
            }

            if (!descricao) {
                return res.status(400).json({
                    erro: 'Informe a descrição da solicitação.',
                });
            }

            if (cidadaoId === profId) {
                return res.status(400).json({
                    erro: 'Você não pode criar uma solicitação para si mesmo.',
                });
            }

            const profissional = await UserModel.buscarPorId(profId);

            if (!profissional || profissional.perfil_tipo !== 'profissional') {
                return res.status(404).json({
                    erro: 'Profissional não encontrado.',
                });
            }

            const novaSolicitacao = await ServicoModel.criar(
                cidadaoId,
                profId,
                descricao,
                null,
                {
                    agenda_servico_id: agendaServicoId,
                    servico_nome: servicoNome || null,
                    endereco_atendimento: enderecoAtendimento || null,
                    agendado_para: agendadoPara,
                    preco,
                }
            );

            return res.status(201).json({
                mensagem: 'Solicitação criada com sucesso.',
                solicitacao: novaSolicitacao,
                servico: novaSolicitacao,
            });
        } catch (erro) {
            console.error('Erro ao criar solicitação:', erro);

            return res.status(500).json({
                erro: 'Erro interno ao criar solicitação.',
            });
        }
    },

    listarMeusPedidos: async (req, res) => {
        try {
            const cidadaoId = obterIdUsuarioLogado(req);
            const status = req.query.status || null;

            if (!cidadaoId) {
                return res.status(401).json({
                    erro: 'Usuário não autenticado.',
                });
            }

            const pedidos = await ServicoModel.buscarPorCidadao(cidadaoId, status);

            return res.status(200).json({
                pedidos,
                solicitacoes: pedidos,
            });
        } catch (erro) {
            console.error('Erro ao listar pedidos do cidadão:', erro);

            return res.status(500).json({
                erro: 'Erro interno ao listar pedidos.',
            });
        }
    },

    listarMinhasSolicitacoes: async (req, res) => {
        try {
            const profId = obterIdUsuarioLogado(req);
            const status = req.query.status || null;

            if (!profId) {
                return res.status(401).json({
                    erro: 'Usuário não autenticado.',
                });
            }

            const solicitacoes = await ServicoModel.buscarPorProfissional(profId, status);

            return res.status(200).json({
                solicitacoes,
                pedidos: solicitacoes,
            });
        } catch (erro) {
            console.error('Erro ao listar solicitações do profissional:', erro);

            return res.status(500).json({
                erro: 'Erro interno ao listar solicitações.',
            });
        }
    },

    atualizarStatus: async (req, res) => {
        try {
            const id = Number(req.params.id);
            const profId = obterIdUsuarioLogado(req);
            const status = req.body.status;
            const preco = req.body.preco !== undefined && req.body.preco !== ''
                ? Number(req.body.preco)
                : null;

            if (!profId) {
                return res.status(401).json({
                    erro: 'Usuário não autenticado.',
                });
            }

            if (!id) {
                return res.status(400).json({
                    erro: 'ID da solicitação inválido.',
                });
            }

            if (!status) {
                return res.status(400).json({
                    erro: 'Informe o novo status da solicitação.',
                });
            }

            const solicitacaoAtualizada = await ServicoModel.atualizarStatus(
                id,
                profId,
                status,
                preco
            );

            if (!solicitacaoAtualizada) {
                return res.status(404).json({
                    erro: 'Solicitação não encontrada ou status inválido.',
                });
            }

            return res.status(200).json({
                mensagem: 'Status atualizado com sucesso.',
                solicitacao: solicitacaoAtualizada,
                servico: solicitacaoAtualizada,
            });
        } catch (erro) {
            console.error('Erro ao atualizar status da solicitação:', erro);

            return res.status(500).json({
                erro: 'Erro interno ao atualizar status da solicitação.',
            });
        }
    },
        cancelarPeloCliente: async (req, res) => {
        try {
            const id = Number(req.params.id);
            const cidadaoId = req.usuarioLogado.id;
            const motivo = req.body.motivo_cancelamento || req.body.motivo || null;

            if (!id) {
                return res.status(400).json({ erro: 'ID da solicitação inválido.' });
            }

            const solicitacao = await ServicoModel.cancelarPeloCliente(id, cidadaoId, motivo);

            if (!solicitacao) {
                return res.status(404).json({
                    erro: 'Solicitação não encontrada ou não pode ser cancelada.',
                });
            }

            return res.status(200).json({
                mensagem: 'Solicitação cancelada com sucesso.',
                solicitacao,
            });
        } catch (erro) {
            console.error('Erro ao cancelar solicitação:', erro);
            return res.status(500).json({ erro: 'Erro interno ao cancelar solicitação.' });
        }
    },

    solicitarRemarcacao: async (req, res) => {
        try {
            const id = Number(req.params.id);
            const profId = req.usuarioLogado.id;
            const novaDataHora =
                req.body.nova_data_hora ||
                req.body.remarcacao_solicitada_para ||
                req.body.agendado_para;

            const motivo = req.body.motivo_remarcacao || req.body.motivo || null;

            if (!id) {
                return res.status(400).json({ erro: 'ID da solicitação inválido.' });
            }

            if (!novaDataHora) {
                return res.status(400).json({
                    erro: 'Informe a nova data e horário para remarcação.',
                });
            }

            const dataRemarcacao = new Date(novaDataHora);

            if (Number.isNaN(dataRemarcacao.getTime())) {
                return res.status(400).json({
                    erro: 'Data ou horário de remarcação inválido.',
                });
            }

            const solicitacao = await ServicoModel.solicitarRemarcacao(
                id,
                profId,
                novaDataHora,
                motivo
            );

            if (!solicitacao) {
                return res.status(404).json({
                    erro: 'Solicitação não encontrada ou não pode ser remarcada.',
                });
            }

            return res.status(200).json({
                mensagem: 'Proposta de remarcação enviada ao cliente.',
                solicitacao,
            });
        } catch (erro) {
            console.error('Erro ao solicitar remarcação:', erro);
            return res.status(500).json({ erro: 'Erro interno ao solicitar remarcação.' });
        }
    },

    aceitarRemarcacao: async (req, res) => {
        try {
            const id = Number(req.params.id);
            const cidadaoId = req.usuarioLogado.id;

            if (!id) {
                return res.status(400).json({ erro: 'ID da solicitação inválido.' });
            }

            const solicitacao = await ServicoModel.aceitarRemarcacao(id, cidadaoId);

            if (!solicitacao) {
                return res.status(404).json({
                    erro: 'Solicitação não encontrada ou não há remarcação pendente.',
                });
            }

            return res.status(200).json({
                mensagem: 'Remarcação aceita com sucesso.',
                solicitacao,
            });
        } catch (erro) {
            console.error('Erro ao aceitar remarcação:', erro);
            return res.status(500).json({ erro: 'Erro interno ao aceitar remarcação.' });
        }
    },

    recusarRemarcacao: async (req, res) => {
        try {
            const id = Number(req.params.id);
            const cidadaoId = req.usuarioLogado.id;

            if (!id) {
                return res.status(400).json({ erro: 'ID da solicitação inválido.' });
            }

            const solicitacao = await ServicoModel.recusarRemarcacao(id, cidadaoId);

            if (!solicitacao) {
                return res.status(404).json({
                    erro: 'Solicitação não encontrada ou não há remarcação pendente.',
                });
            }

            return res.status(200).json({
                mensagem: 'Remarcação recusada. O horário original foi mantido.',
                solicitacao,
            });
        } catch (erro) {
            console.error('Erro ao recusar remarcação:', erro);
            return res.status(500).json({ erro: 'Erro interno ao recusar remarcação.' });
        }
    },
};

module.exports = SolicitacaoController;