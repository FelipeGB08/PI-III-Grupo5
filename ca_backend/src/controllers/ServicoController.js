const pool = require('../config/db');
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

const ServicoController = {
    criarServico: async (req, res) => {
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
                    erro: 'Informe o profissional responsável pelo serviço.',
                });
            }

            if (!descricao) {
                return res.status(400).json({
                    erro: 'Informe a descrição do serviço.',
                });
            }

            if (cidadaoId === profId) {
                return res.status(400).json({
                    erro: 'Você não pode solicitar um serviço para si mesmo.',
                });
            }

            const profissional = await UserModel.buscarPorId(profId);

            if (!profissional || profissional.perfil_tipo !== 'profissional') {
                return res.status(404).json({
                    erro: 'Profissional não encontrado.',
                });
            }

            if (agendadoPara) {
                const dataAgendada = new Date(agendadoPara);

                if (Number.isNaN(dataAgendada.getTime())) {
                    return res.status(400).json({
                        erro: 'Data ou horário de agendamento inválido.',
                    });
                }

                const conflito = await pool.query(
                    `
                    SELECT id
                    FROM servicos_solicitados
                    WHERE prof_id = $1
                      AND status IN ('pendente', 'aceito')
                      AND agendado_para = $2
                    LIMIT 1;
                    `,
                    [profId, agendadoPara]
                );

                if (conflito.rows.length > 0) {
                    return res.status(409).json({
                        erro: 'Já existe uma solicitação para este profissional neste horário.',
                    });
                }
            }

            const fotoUrl = req.file
                ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
                : null;

            const novoServico = await ServicoModel.criar(
                cidadaoId,
                profId,
                descricao,
                fotoUrl,
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
                servico: novoServico,
                solicitacao: novoServico,
            });
        } catch (erro) {
            console.error('Erro ao criar serviço:', erro);

            return res.status(500).json({
                erro: 'Erro interno ao criar solicitação de serviço.',
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
                    erro: 'ID do serviço inválido.',
                });
            }

            if (!status) {
                return res.status(400).json({
                    erro: 'Informe o novo status do serviço.',
                });
            }

            const servicoAtualizado = await ServicoModel.atualizarStatus(
                id,
                profId,
                status,
                preco
            );

            if (!servicoAtualizado) {
                return res.status(404).json({
                    erro: 'Serviço não encontrado ou status inválido.',
                });
            }

            return res.status(200).json({
                mensagem: 'Status atualizado com sucesso.',
                servico: servicoAtualizado,
                solicitacao: servicoAtualizado,
            });
        } catch (erro) {
            console.error('Erro ao atualizar status do serviço:', erro);

            return res.status(500).json({
                erro: 'Erro interno ao atualizar status do serviço.',
            });
        }
    },
};

module.exports = ServicoController;