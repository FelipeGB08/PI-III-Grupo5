const ServicoModel = require('../models/ServicoModel');
const UserModel = require('../models/UserModel');
const { validarAgendamento } = require('../services/agendamentoValidator');
const {
    confirmarConclusoesExpiradas,
} = require('../services/conclusaoService');
const { notificarUsuarioSemBloquear } = require('../services/notificationService');

const normalizarTexto = (valor) => {
    if (valor === undefined || valor === null) return '';
    return String(valor).trim();
};

const obterIdUsuarioLogado = (req) => {
    return req.usuarioLogado?.id || req.usuario?.id || req.user?.id;
};

function calcularPoliticaCancelamento(solicitacao) {
    const agendadoPara = solicitacao?.agendado_para
        ? new Date(solicitacao.agendado_para)
        : null;

    if (!agendadoPara || Number.isNaN(agendadoPara.getTime())) {
        return {
            politica: 'sem_horario_agendado',
            reembolso: 'reembolso_integral',
        };
    }

    const horasAntecedencia =
        (agendadoPara.getTime() - Date.now()) / (1000 * 60 * 60);

    if (horasAntecedencia >= 2) {
        return {
            politica: 'cancelamento_antecipado',
            reembolso: 'reembolso_integral',
        };
    }

    return {
        politica: 'cancelamento_tardio',
        reembolso: 'reembolso_parcial',
    };
}

function notificarNovoChamado(solicitacao) {
    notificarUsuarioSemBloquear({
        usuarioId: solicitacao.prof_id,
        tipo: 'novo_chamado',
        titulo: 'Novo chamado recebido',
        corpo: `Cliente solicitou ${solicitacao.servico_nome || 'um servico'}.`,
        payload: {
            solicitacao_id: solicitacao.id,
            status: solicitacao.status,
        },
    });
}

function notificarStatusCliente(solicitacao) {
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
        aguardando_confirmacao_cliente: {
            tipo: 'confirmacao_conclusao_pendente',
            titulo: 'Confirme a conclusao do servico',
            corpo: 'O prestador encerrou o atendimento e enviou evidencias. Confirme a conclusao no aplicativo.',
        },
    };

    const evento = eventoPorStatus[solicitacao.status];
    if (!evento) return;

    notificarUsuarioSemBloquear({
        usuarioId: solicitacao.cidadao_id,
        ...evento,
        payload: {
            solicitacao_id: solicitacao.id,
            status: solicitacao.status,
        },
    });
}

const SolicitacaoController = {
    buscarPorId: async (req, res) => {
        try {
            const id = Number(req.params.id);
            const usuarioId = obterIdUsuarioLogado(req);

            if (!usuarioId) {
                return res.status(401).json({ erro: 'Usuario nao autenticado.' });
            }

            if (!id) {
                return res.status(400).json({ erro: 'ID da solicitacao invalido.' });
            }

            await confirmarConclusoesExpiradas({ servicoId: id });
            const solicitacao = await ServicoModel.buscarDetalhadoPorId(id, usuarioId);
            if (!solicitacao) {
                return res.status(404).json({ erro: 'Solicitacao nao encontrada.' });
            }

            return res.status(200).json({ solicitacao, servico: solicitacao });
        } catch (erro) {
            console.error('Erro ao buscar solicitacao:', erro);
            return res.status(500).json({ erro: 'Erro interno ao buscar solicitacao.' });
        }
    },

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
            const latitudeAtendimentoInformada =
                req.body.atendimento_latitude ??
                req.body.latitude_atendimento ??
                req.body.atendimentoLatitude;
            const longitudeAtendimentoInformada =
                req.body.atendimento_longitude ??
                req.body.longitude_atendimento ??
                req.body.atendimentoLongitude;
            const latitudeAtendimento = (
                latitudeAtendimentoInformada === undefined ||
                latitudeAtendimentoInformada === null ||
                String(latitudeAtendimentoInformada).trim() === ''
            )
                ? null
                : Number(latitudeAtendimentoInformada);
            const longitudeAtendimento = (
                longitudeAtendimentoInformada === undefined ||
                longitudeAtendimentoInformada === null ||
                String(longitudeAtendimentoInformada).trim() === ''
            )
                ? null
                : Number(longitudeAtendimentoInformada);
            const fotoUrl = normalizarTexto(req.body.foto_url || req.body.fotoUrl) || null;
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

            if (cidadaoId === profId) {
                return res.status(400).json({
                    erro: 'Voce nao pode criar uma solicitacao para si mesmo.',
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

            const novaSolicitacao = await ServicoModel.criar(
                cidadaoId,
                profId,
                descricao,
                fotoUrl,
                {
                    agenda_servico_id: dadosAgenda.agenda_servico_id,
                    servico_nome: dadosAgenda.servico_nome,
                    endereco_atendimento: enderecoAtendimento || null,
                    ...(latitudeAtendimento !== null &&
                    longitudeAtendimento !== null
                        ? {
                            atendimento_latitude: latitudeAtendimento,
                            atendimento_longitude: longitudeAtendimento,
                        }
                        : {}),
                    agendado_para: dadosAgenda.agendado_para,
                    preco: dadosAgenda.preco,
                    duracao_minutos: dadosAgenda.duracao_minutos,
                }
            );

            notificarNovoChamado(novaSolicitacao);

            return res.status(201).json({
                mensagem: 'Solicitacao criada com sucesso.',
                solicitacao: novaSolicitacao,
                servico: novaSolicitacao,
            });
        } catch (erro) {
            if (!erro.status || erro.status >= 500) {
                console.error('Erro ao criar solicitacao:', erro);
            }

            return res.status(erro.status || 500).json({
                erro: erro.status ? erro.message : 'Erro interno ao criar solicitacao.',
            });
        }
    },

    listarMeusPedidos: async (req, res) => {
        try {
            const cidadaoId = obterIdUsuarioLogado(req);
            const query = req.validated?.query || req.query || {};
            const status = query.status || null;
            const { page, pageSize } = query;

            if (!cidadaoId) {
                return res.status(401).json({ erro: 'Usuario nao autenticado.' });
            }

            await confirmarConclusoesExpiradas();
            const resultado = await ServicoModel.buscarPorCidadao(
                cidadaoId,
                status,
                { page, pageSize }
            );
            const { items: pedidos, ...paginacao } = resultado;
            return res.status(200).json({
                pedidos,
                solicitacoes: pedidos,
                ...paginacao,
                paginacao,
            });
        } catch (erro) {
            console.error('Erro ao listar pedidos do cidadao:', erro);
            return res.status(500).json({ erro: 'Erro interno ao listar pedidos.' });
        }
    },

    listarMinhasSolicitacoes: async (req, res) => {
        try {
            const profId = obterIdUsuarioLogado(req);
            const query = req.validated?.query || req.query || {};
            const status = query.status || null;
            const { page, pageSize } = query;

            if (!profId) {
                return res.status(401).json({ erro: 'Usuario nao autenticado.' });
            }

            await confirmarConclusoesExpiradas();
            const resultado = await ServicoModel.buscarPorProfissional(
                profId,
                status,
                { page, pageSize }
            );
            const { items: solicitacoes, ...paginacao } = resultado;
            return res.status(200).json({
                solicitacoes,
                pedidos: solicitacoes,
                ...paginacao,
                paginacao,
            });
        } catch (erro) {
            console.error('Erro ao listar solicitacoes do profissional:', erro);
            return res.status(500).json({ erro: 'Erro interno ao listar solicitacoes.' });
        }
    },

    buscarFinanceiro: async (req, res) => {
        try {
            const usuarioId = obterIdUsuarioLogado(req);
            const perfilTipo = req.usuarioLogado?.perfil_tipo;
            const query = req.validated?.query || req.query || {};
            const status = query.status || null;
            const { page, pageSize } = query;

            if (!usuarioId) {
                return res.status(401).json({ erro: 'Usuario nao autenticado.' });
            }

            if (!['cidadao', 'profissional', 'admin'].includes(perfilTipo)) {
                return res.status(403).json({ erro: 'Perfil sem acesso ao financeiro.' });
            }

            await confirmarConclusoesExpiradas();
            const financeiro = await ServicoModel.buscarFinanceiroUsuario({
                usuarioId,
                perfilTipo,
                status,
                page,
                pageSize,
            });

            return res.status(200).json(financeiro);
        } catch (erro) {
            console.error('Erro ao buscar financeiro:', erro);
            return res.status(500).json({ erro: 'Erro interno ao buscar financeiro.' });
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
                return res.status(400).json({ erro: 'ID da solicitacao invalido.' });
            }

            if (!status) {
                return res.status(400).json({ erro: 'Informe o novo status da solicitacao.' });
            }

            if (req.body.preco !== undefined || req.body.preco_proposto !== undefined) {
                return res.status(400).json({
                    erro: 'Use o fluxo de proposta de valor para alterar o preco.',
                });
            }

            const solicitacaoAtualizada = status === 'concluido'
                ? await ServicoModel.marcarConclusaoPeloPrestador(id, profId)
                : await ServicoModel.atualizarStatus(id, profId, status);

            if (!solicitacaoAtualizada) {
                if (status === 'concluido') {
                    return res.status(409).json({
                        erro: 'A conclusao exige um chamado aceito e ao menos uma foto de evidencia.',
                    });
                }
                return res.status(404).json({
                    erro: 'Solicitacao nao encontrada ou status invalido.',
                });
            }

            notificarStatusCliente(solicitacaoAtualizada);

            return res.status(200).json({
                mensagem: status === 'concluido'
                    ? 'Conclusao enviada para confirmacao do cliente.'
                    : 'Status atualizado com sucesso.',
                solicitacao: solicitacaoAtualizada,
                servico: solicitacaoAtualizada,
            });
        } catch (erro) {
            console.error('Erro ao atualizar status da solicitacao:', erro);
            return res.status(500).json({
                erro: 'Erro interno ao atualizar status da solicitacao.',
            });
        }
    },

    confirmarConclusao: async (req, res) => {
        try {
            const id = Number(req.params.id);
            const cidadaoId = obterIdUsuarioLogado(req);

            if (!cidadaoId) {
                return res.status(401).json({ erro: 'Usuario nao autenticado.' });
            }

            if (!id) {
                return res.status(400).json({ erro: 'ID da solicitacao invalido.' });
            }

            const confirmadasAutomaticamente = await confirmarConclusoesExpiradas({
                servicoId: id,
            });
            const confirmadaAutomaticamente = confirmadasAutomaticamente.find(
                (item) => Number(item.cidadao_id) === Number(cidadaoId)
            );
            if (confirmadaAutomaticamente) {
                return res.status(200).json({
                    mensagem: 'Conclusao confirmada automaticamente apos o prazo de 72 horas.',
                    solicitacao: confirmadaAutomaticamente,
                    servico: confirmadaAutomaticamente,
                });
            }

            const solicitacao = await ServicoModel.confirmarConclusaoPeloCliente(
                id,
                cidadaoId
            );

            if (!solicitacao) {
                return res.status(409).json({
                    erro: 'Solicitacao nao encontrada, ja concluida ou sem confirmacao pendente.',
                });
            }

            notificarUsuarioSemBloquear({
                usuarioId: solicitacao.prof_id,
                tipo: 'conclusao_confirmada_cliente',
                titulo: 'Conclusao confirmada',
                corpo: 'O cliente confirmou a conclusao do atendimento.',
                payload: {
                    solicitacao_id: solicitacao.id,
                    status: solicitacao.status,
                    destino: 'agendamento',
                },
            });

            return res.status(200).json({
                mensagem: 'Conclusao confirmada com sucesso.',
                solicitacao,
                servico: solicitacao,
            });
        } catch (erro) {
            console.error('Erro ao confirmar conclusao da solicitacao:', erro);
            return res.status(500).json({
                erro: 'Erro interno ao confirmar conclusao da solicitacao.',
            });
        }
    },

    proporValor: async (req, res) => {
        try {
            const id = Number(req.params.id);
            const profId = obterIdUsuarioLogado(req);
            const preco = Number(req.body.preco || req.body.preco_proposto);
            const motivo = req.body.motivo || req.body.motivo_proposta_valor || null;

            if (!profId) {
                return res.status(401).json({ erro: 'Usuario nao autenticado.' });
            }

            if (!id) {
                return res.status(400).json({ erro: 'ID da solicitacao invalido.' });
            }

            if (!Number.isFinite(preco) || preco <= 0) {
                return res.status(400).json({ erro: 'Informe um valor valido para a proposta.' });
            }

            const solicitacao = await ServicoModel.proporValor(id, profId, preco, motivo);
            if (!solicitacao) {
                return res.status(404).json({
                    erro: 'Solicitacao nao encontrada ou nao permite proposta de valor.',
                });
            }

            notificarUsuarioSemBloquear({
                usuarioId: solicitacao.cidadao_id,
                tipo: 'proposta_valor',
                titulo: 'Nova proposta de valor',
                corpo: `O prestador sugeriu R$ ${Number(preco).toFixed(2)} para o atendimento.`,
                payload: {
                    solicitacao_id: solicitacao.id,
                    status: solicitacao.status,
                    destino: 'agendamento',
                },
            });

            return res.status(200).json({
                mensagem: 'Proposta de valor enviada ao cliente.',
                solicitacao,
                servico: solicitacao,
            });
        } catch (erro) {
            console.error('Erro ao propor valor:', erro);
            return res.status(500).json({ erro: 'Erro interno ao propor valor.' });
        }
    },

    aceitarPropostaValor: async (req, res) => {
        try {
            const id = Number(req.params.id);
            const cidadaoId = req.usuarioLogado.id;

            if (!id) {
                return res.status(400).json({ erro: 'ID da solicitacao invalido.' });
            }

            const solicitacao = await ServicoModel.aceitarPropostaValor(id, cidadaoId);
            if (!solicitacao) {
                return res.status(404).json({ erro: 'Proposta de valor nao encontrada.' });
            }

            notificarUsuarioSemBloquear({
                usuarioId: solicitacao.prof_id,
                tipo: 'proposta_valor_aceita',
                titulo: 'Proposta aceita',
                corpo: 'O cliente aceitou o novo valor. Voce ja pode confirmar o chamado.',
                payload: {
                    solicitacao_id: solicitacao.id,
                    status: solicitacao.status,
                    destino: 'agendamento',
                },
            });

            return res.status(200).json({
                mensagem: 'Proposta de valor aceita.',
                solicitacao,
                servico: solicitacao,
            });
        } catch (erro) {
            console.error('Erro ao aceitar proposta de valor:', erro);
            return res.status(500).json({ erro: 'Erro interno ao aceitar proposta de valor.' });
        }
    },

    recusarPropostaValor: async (req, res) => {
        try {
            const id = Number(req.params.id);
            const cidadaoId = req.usuarioLogado.id;

            if (!id) {
                return res.status(400).json({ erro: 'ID da solicitacao invalido.' });
            }

            const solicitacao = await ServicoModel.recusarPropostaValor(id, cidadaoId);
            if (!solicitacao) {
                return res.status(404).json({ erro: 'Proposta de valor nao encontrada.' });
            }

            notificarUsuarioSemBloquear({
                usuarioId: solicitacao.prof_id,
                tipo: 'proposta_valor_recusada',
                titulo: 'Proposta recusada',
                corpo: 'O cliente recusou o novo valor. O orcamento anterior foi mantido.',
                payload: {
                    solicitacao_id: solicitacao.id,
                    status: solicitacao.status,
                    destino: 'agendamento',
                },
            });

            return res.status(200).json({
                mensagem: 'Proposta de valor recusada.',
                solicitacao,
                servico: solicitacao,
            });
        } catch (erro) {
            console.error('Erro ao recusar proposta de valor:', erro);
            return res.status(500).json({ erro: 'Erro interno ao recusar proposta de valor.' });
        }
    },

    uploadFotosConclusao: async (req, res) => {
        try {
            const id = Number(req.params.id);
            const profId = obterIdUsuarioLogado(req);
            const arquivos = req.files || [];

            if (!profId) {
                return res.status(401).json({ erro: 'Usuario nao autenticado.' });
            }

            if (!id) {
                return res.status(400).json({ erro: 'ID da solicitacao invalido.' });
            }

            if (arquivos.length === 0) {
                return res.status(400).json({ erro: 'Envie ao menos uma foto do servico concluido.' });
            }

            const fotos = arquivos.map((arquivo) => arquivo.url);
            const solicitacao = await ServicoModel.adicionarFotosConclusao(id, profId, fotos);

            if (!solicitacao) {
                return res.status(404).json({
                    erro: 'Solicitacao nao encontrada ou nao permite anexar fotos.',
                });
            }

            return res.status(200).json({
                mensagem: 'Fotos de conclusao anexadas com sucesso.',
                solicitacao,
                servico: solicitacao,
            });
        } catch (erro) {
            console.error('Erro ao anexar fotos de conclusao:', erro);
            return res.status(500).json({
                erro: 'Erro interno ao anexar fotos de conclusao.',
            });
        }
    },

    cancelarPeloCliente: async (req, res) => {
        try {
            const id = Number(req.params.id);
            const cidadaoId = req.usuarioLogado.id;
            const motivo = req.body.motivo_cancelamento || req.body.motivo || null;

            if (!id) {
                return res.status(400).json({ erro: 'ID da solicitacao invalido.' });
            }

            const solicitacaoAtual = await ServicoModel.buscarPorId(id);
            if (!solicitacaoAtual || Number(solicitacaoAtual.cidadao_id) !== Number(cidadaoId)) {
                return res.status(404).json({
                    erro: 'Solicitacao nao encontrada ou nao pode ser cancelada.',
                });
            }

            const politica = calcularPoliticaCancelamento(solicitacaoAtual);
            const solicitacao = await ServicoModel.cancelarPeloCliente(
                id,
                cidadaoId,
                motivo,
                politica.politica,
                politica.reembolso
            );
            if (!solicitacao) {
                return res.status(404).json({
                    erro: 'Solicitacao nao encontrada ou nao pode ser cancelada.',
                });
            }

            notificarUsuarioSemBloquear({
                usuarioId: solicitacao.prof_id,
                tipo: 'chamado_cancelado',
                titulo: 'Chamado cancelado',
                corpo: 'O cliente cancelou uma solicitacao.',
                payload: {
                    solicitacao_id: solicitacao.id,
                    status: solicitacao.status,
                },
            });

            return res.status(200).json({
                mensagem: 'Solicitacao cancelada com sucesso.',
                politica_cancelamento: politica.politica,
                reembolso_status: politica.reembolso,
                solicitacao,
            });
        } catch (erro) {
            console.error('Erro ao cancelar solicitacao:', erro);
            return res.status(500).json({ erro: 'Erro interno ao cancelar solicitacao.' });
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
                return res.status(400).json({ erro: 'ID da solicitacao invalido.' });
            }

            if (!novaDataHora) {
                return res.status(400).json({
                    erro: 'Informe a nova data e horario para remarcacao.',
                });
            }

            const dataRemarcacao = new Date(novaDataHora);
            if (Number.isNaN(dataRemarcacao.getTime())) {
                return res.status(400).json({ erro: 'Data ou horario de remarcacao invalido.' });
            }

            if (dataRemarcacao.getTime() <= Date.now()) {
                return res.status(400).json({
                    erro: 'Nao e permitido remarcar para horario passado.',
                });
            }

            const solicitacaoAtual = await ServicoModel.buscarPorId(id);
            if (
                !solicitacaoAtual ||
                Number(solicitacaoAtual.prof_id) !== Number(profId) ||
                !['pendente', 'aceito'].includes(solicitacaoAtual.status)
            ) {
                return res.status(404).json({
                    erro: 'Solicitacao nao encontrada ou nao pode ser remarcada.',
                });
            }

            const dadosAgenda = await validarAgendamento({
                profId,
                agendaServicoId: solicitacaoAtual.agenda_servico_id,
                agendadoPara: novaDataHora,
                ignorarSolicitacaoId: id,
            });

            const solicitacao = await ServicoModel.solicitarRemarcacao(
                id,
                profId,
                dadosAgenda.agendado_para,
                motivo
            );

            if (!solicitacao) {
                return res.status(404).json({
                    erro: 'Solicitacao nao encontrada ou nao pode ser remarcada.',
                });
            }

            notificarUsuarioSemBloquear({
                usuarioId: solicitacao.cidadao_id,
                tipo: 'remarcacao_solicitada',
                titulo: 'Proposta de remarcacao',
                corpo: 'O prestador sugeriu um novo horario para o atendimento.',
                payload: {
                    solicitacao_id: solicitacao.id,
                    status: solicitacao.status,
                },
            });

            return res.status(200).json({
                mensagem: 'Proposta de remarcacao enviada ao cliente.',
                solicitacao,
            });
        } catch (erro) {
            console.error('Erro ao solicitar remarcacao:', erro);
            return res.status(500).json({ erro: 'Erro interno ao solicitar remarcacao.' });
        }
    },

    aceitarRemarcacao: async (req, res) => {
        try {
            const id = Number(req.params.id);
            const cidadaoId = req.usuarioLogado.id;

            if (!id) {
                return res.status(400).json({ erro: 'ID da solicitacao invalido.' });
            }

            const solicitacao = await ServicoModel.aceitarRemarcacao(id, cidadaoId);
            if (!solicitacao) {
                return res.status(404).json({
                    erro: 'Solicitacao nao encontrada ou nao ha remarcacao pendente.',
                });
            }

            notificarUsuarioSemBloquear({
                usuarioId: solicitacao.prof_id,
                tipo: 'remarcacao_aceita',
                titulo: 'Remarcacao aceita',
                corpo: 'O cliente aceitou o novo horario proposto.',
                payload: {
                    solicitacao_id: solicitacao.id,
                    status: solicitacao.status,
                },
            });

            return res.status(200).json({
                mensagem: 'Remarcacao aceita com sucesso.',
                solicitacao,
            });
        } catch (erro) {
            console.error('Erro ao aceitar remarcacao:', erro);
            return res.status(500).json({ erro: 'Erro interno ao aceitar remarcacao.' });
        }
    },

    recusarRemarcacao: async (req, res) => {
        try {
            const id = Number(req.params.id);
            const cidadaoId = req.usuarioLogado.id;

            if (!id) {
                return res.status(400).json({ erro: 'ID da solicitacao invalido.' });
            }

            const solicitacao = await ServicoModel.recusarRemarcacao(id, cidadaoId);
            if (!solicitacao) {
                return res.status(404).json({
                    erro: 'Solicitacao nao encontrada ou nao ha remarcacao pendente.',
                });
            }

            notificarUsuarioSemBloquear({
                usuarioId: solicitacao.prof_id,
                tipo: 'remarcacao_recusada',
                titulo: 'Remarcacao recusada',
                corpo: 'O cliente recusou a remarcacao. O horario original foi mantido.',
                payload: {
                    solicitacao_id: solicitacao.id,
                    status: solicitacao.status,
                },
            });

            return res.status(200).json({
                mensagem: 'Remarcacao recusada. O horario original foi mantido.',
                solicitacao,
            });
        } catch (erro) {
            console.error('Erro ao recusar remarcacao:', erro);
            return res.status(500).json({ erro: 'Erro interno ao recusar remarcacao.' });
        }
    },
};

module.exports = SolicitacaoController;
