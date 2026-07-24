const ServicoModel = require('../models/ServicoModel');
const UserModel = require('../models/UserModel');
const { validarAgendamento } = require('../services/agendamentoValidator');
const { notificarUsuarioSemBloquear } = require('../services/notificationService');

const normalizarTexto = (valor) => {
    if (valor === undefined || valor === null) return '';
    return String(valor).trim();
};

const obterIdUsuarioLogado = (req) => {
    return req.usuarioLogado?.id || req.usuario?.id || req.user?.id;
};

function notificarNovoChamado(servico) {
    notificarUsuarioSemBloquear({
        usuarioId: servico.prof_id,
        tipo: 'novo_chamado',
        titulo: 'Novo chamado recebido',
        corpo: `Cliente solicitou ${servico.servico_nome || 'um servico'}.`,
        payload: {
            solicitacao_id: servico.id,
            status: servico.status,
        },
    });
}

function notificarStatusCliente(servico) {
    const eventoPorStatus = {
        aceito: {
            tipo: 'chamado_aceito',
            titulo: 'Chamado aceito',
            corpo: 'O prestador aceitou sua solicitacao.',
        },
        recusado: {
            tipo: 'chamado_recusado',
            titulo: 'Chamado recusado',
            corpo: 'O prestador recusou sua solicitacao.',
        },
        concluido: {
            tipo: 'chamado_concluido',
            titulo: 'Chamado concluido',
            corpo: 'Seu atendimento foi marcado como concluido. Avalie o servico.',
        },
    };

    const evento = eventoPorStatus[servico.status];
    if (!evento) return;

    notificarUsuarioSemBloquear({
        usuarioId: servico.cidadao_id,
        ...evento,
        payload: {
            solicitacao_id: servico.id,
            status: servico.status,
        },
    });
}

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

            if (!cidadaoId) {
                return res.status(401).json({ erro: 'Usuario nao autenticado.' });
            }

            if (!profId) {
                return res.status(400).json({ erro: 'Informe o profissional responsavel pelo servico.' });
            }

            if (!descricao) {
                return res.status(400).json({ erro: 'Informe a descricao do servico.' });
            }

            if (cidadaoId === profId) {
                return res.status(400).json({
                    erro: 'Voce nao pode solicitar um servico para si mesmo.',
                });
            }

            const profissional = await UserModel.buscarPorId(profId);
            if (!profissional || profissional.perfil_tipo !== 'profissional') {
                return res.status(404).json({ erro: 'Profissional nao encontrado.' });
            }

            const dadosAgenda = await validarAgendamento({
                profId,
                agendaServicoId,
                agendadoPara,
            });

            const fotoUrl = req.file?.url || null;

            const novoServico = await ServicoModel.criar(
                cidadaoId,
                profId,
                descricao,
                fotoUrl,
                {
                    agenda_servico_id: dadosAgenda.agenda_servico_id,
                    servico_nome: dadosAgenda.servico_nome,
                    endereco_atendimento: enderecoAtendimento || null,
                    agendado_para: dadosAgenda.agendado_para,
                    preco: dadosAgenda.preco,
                    duracao_minutos: dadosAgenda.duracao_minutos,
                }
            );

            notificarNovoChamado(novoServico);

            return res.status(201).json({
                mensagem: 'Solicitacao criada com sucesso.',
                servico: novoServico,
                solicitacao: novoServico,
            });
        } catch (erro) {
            if (!erro.status || erro.status >= 500) {
                console.error('Erro ao criar servico:', erro);
            }

            return res.status(erro.status || 500).json({
                erro: erro.status
                    ? erro.message
                    : 'Erro interno ao criar solicitacao de servico.',
            });
        }
    },

    atualizarStatus: async (req, res) => {
        try {
            const id = Number(req.params.id);
            const profId = obterIdUsuarioLogado(req);
            const status = req.body.status;

            if (!profId) {
                return res.status(401).json({ erro: 'Usuario nao autenticado.' });
            }

            if (!id) {
                return res.status(400).json({ erro: 'ID do servico invalido.' });
            }

            if (!status) {
                return res.status(400).json({ erro: 'Informe o novo status do servico.' });
            }

            if (req.body.preco !== undefined || req.body.preco_proposto !== undefined) {
                return res.status(400).json({
                    erro: 'Use o fluxo de proposta de valor para alterar o preco.',
                });
            }

            const servicoAtualizado = await ServicoModel.atualizarStatus(
                id,
                profId,
                status
            );

            if (!servicoAtualizado) {
                return res.status(404).json({
                    erro: 'Servico nao encontrado ou status invalido.',
                });
            }

            notificarStatusCliente(servicoAtualizado);

            return res.status(200).json({
                mensagem: 'Status atualizado com sucesso.',
                servico: servicoAtualizado,
                solicitacao: servicoAtualizado,
            });
        } catch (erro) {
            console.error('Erro ao atualizar status do servico:', erro);

            return res.status(500).json({
                erro: 'Erro interno ao atualizar status do servico.',
            });
        }
    },
};

module.exports = ServicoController;
