criarServico: async (req, res) => {
    try {
        const cidadaoId = req.usuarioLogado.id;
        const profId = Number(req.body.prof_id || req.body.profissional_id);

        const descricao = req.body.descricao;

        const agendaServicoId = req.body.agenda_servico_id
            ? Number(req.body.agenda_servico_id)
            : null;

        const agendadoPara = req.body.agendado_para || req.body.agendadoPara || null;

        if (agendadoPara) {
    const agora = new Date();
    const dataAgendada = new Date(agendadoPara);

    if (dataAgendada < agora) {
        return res.status(400).json({
            erro: 'Não é permitido agendar em horário passado.'
        });
    }
}

        const enderecoAtendimento =
            String(req.body.endereco_atendimento || req.body.enderecoAtendimento || '').trim();

        if (!profId || !descricao) {
            return res.status(400).json({
                erro: 'prof_id e descricao são obrigatórios.',
            });
        }

        if (cidadaoId === profId) {
            return res.status(400).json({
                erro: 'Você não pode solicitar serviço para si mesmo.',
            });
        }

        const profissional = await UserModel.buscarPorId(profId);
        if (!profissional || profissional.perfil_tipo !== 'profissional') {
            return res.status(404).json({ erro: 'Profissional não encontrado.' });
        }

   
        let servicoBanco = null;
        let preco = null;
        let duracao = null;
        let nomeServico = null;

        if (agendaServicoId) {
            const agenda = await require('../models/AgendaModel')
                .buscarPorProfissional(profId);

            const servico = agenda.servicos.find(s => s.id === agendaServicoId);

            if (!servico) {
                return res.status(404).json({
                    erro: 'Serviço inválido para esse profissional.',
                });
            }

            servicoBanco = servico;
            preco = servico.preco;
            duracao = servico.duracao_minutos;
            nomeServico = servico.nome;
        }

  
        if (agendadoPara) {
            const agora = new Date();
            const dataAgendada = new Date(agendadoPara);

            if (dataAgendada < agora) {
                return res.status(400).json({
                    erro: 'Não é permitido agendar em horário passado.',
                });
            }

            const conflito = await pool.query(`
                SELECT id FROM servicos_solicitados
                WHERE prof_id = $1
                AND status IN ('pendente','aceito')
                AND agendado_para = $2
                LIMIT 1
            `, [profId, agendadoPara]);

            if (conflito.rows.length > 0) {
                return res.status(409).json({
                    erro: 'Já existe um agendamento neste horário.',
                });
            }
        }

        const fotoUrl = req.file
            ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
            : null;

        const novoServico = await ServicoModel.criar(
            cidadaoId,
            profId,
            descricao.trim(),
            fotoUrl,
            {
                agenda_servico_id: agendaServicoId,
                servico_nome: nomeServico,
                endereco_atendimento: enderecoAtendimento,
                agendado_para: agendadoPara,
                preco,
                duracao,
            }
        );

        return res.status(201).json({
            mensagem: 'Orçamento solicitado com sucesso!',
            servico: novoServico,
            solicitacao: novoServico,
        });

    } catch (erro) {
        console.error('Erro ao criar serviço:', erro);
        return res.status(500).json({
            erro: 'Falha interna ao processar solicitação.',
        });
    }
}