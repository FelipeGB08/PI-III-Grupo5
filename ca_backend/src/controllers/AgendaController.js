const AgendaModel = require('../models/AgendaModel');
const UserModel = require('../models/UserModel');

function normalizarServico(item) {
    const nome = String(item?.nome || '').trim();
    const duracao = Number(item?.duracao_minutos ?? item?.duracaoMinutos);
    const preco = Number(item?.preco);

    if (nome.length < 3) {
        return { erro: 'Cada serviço precisa ter nome com ao menos 3 caracteres.' };
    }

    if (!Number.isFinite(duracao) || duracao < 15 || duracao > 480) {
        return { erro: 'A duração de cada serviço deve ficar entre 15 e 480 minutos.' };
    }

    if (!Number.isFinite(preco) || preco <= 0) {
        return { erro: 'O preço de cada serviço deve ser maior que zero.' };
    }

    return {
        nome,
        duracao_minutos: Math.round(duracao),
        preco,
    };
}

function normalizarHorarios(body) {
    const dias = Array.isArray(body.dias_semana)
        ? body.dias_semana
        : body.diasSemana;

    const horariosBase = Array.isArray(body.horarios)
        ? body.horarios
        : [];

    const resultado = [];

    if (horariosBase.length === 0) return resultado;

    // Caso simples: lista de strings
    if (horariosBase.every((item) => typeof item === 'string')) {
        const diasNormalizados = (Array.isArray(dias) && dias.length > 0
            ? dias
            : [1, 2, 3, 4, 5]
        )
            .map(Number)
            .filter((dia) => Number.isInteger(dia) && dia >= 1 && dia <= 7);

        const diasUnicos = [...new Set(diasNormalizados)];

        for (const dia of diasUnicos) {
            for (const horario of horariosBase) {
                const horarioNormalizado = AgendaModel.normalizarHorario(horario);
                if (horarioNormalizado) {
                    resultado.push({
                        dia_semana: dia,
                        horario: horarioNormalizado,
                    });
                }
            }
        }

        return resultado;
    }

    // Caso objeto { dia_semana, horario }
    for (const item of horariosBase) {
        const dia = Number(item?.dia_semana ?? item?.diaSemana);
        const horario = AgendaModel.normalizarHorario(item?.horario);

        if (
            Number.isInteger(dia) &&
            dia >= 1 &&
            dia <= 7 &&
            horario
        ) {
            resultado.push({
                dia_semana: dia,
                horario,
            });
        }
    }

    return resultado;
}

const AgendaController = {
    buscarPublica: async (req, res) => {
        try {
            const profissionalId = Number(req.params.id);

            const profissional = await UserModel.buscarPorId(profissionalId);

            if (!profissional || profissional.perfil_tipo !== 'profissional') {
                return res.status(404).json({
                    erro: 'Profissional não encontrado.'
                });
            }

            const agenda = await AgendaModel.buscarPorProfissional(profissionalId);

            return res.status(200).json(agenda);
        } catch (erro) {
            console.error('Erro ao buscar agenda pública:', erro);
            return res.status(500).json({
                erro: 'Erro ao carregar agenda do profissional.'
            });
        }
    },

    buscarMinha: async (req, res) => {
        try {
            const agenda = await AgendaModel.buscarPorProfissional(
                req.usuarioLogado.id
            );

            return res.status(200).json(agenda);
        } catch (erro) {
            console.error('Erro ao buscar minha agenda:', erro);
            return res.status(500).json({
                erro: 'Erro ao carregar sua agenda.'
            });
        }
    },

    salvarMinha: async (req, res) => {
        try {
            const servicosRecebidos = Array.isArray(req.body.servicos)
                ? req.body.servicos
                : [];

            if (servicosRecebidos.length === 0 || servicosRecebidos.length > 12) {
                return res.status(400).json({
                    erro: 'Informe entre 1 e 12 serviços.'
                });
            }

            const servicos = [];

            for (const item of servicosRecebidos) {
                const normalizado = normalizarServico(item);

                if (normalizado.erro) {
                    return res.status(400).json({
                        erro: normalizado.erro
                    });
                }

                servicos.push(normalizado);
            }

            const horarios = normalizarHorarios(req.body);

            if (horarios.length === 0) {
                return res.status(400).json({
                    erro: 'Informe ao menos um horário válido.'
                });
            }

            const agenda = await AgendaModel.salvarParaProfissional(
                req.usuarioLogado.id,
                {
                    servicos,
                    horarios,
                }
            );

            return res.status(200).json({
                mensagem: 'Agenda salva com sucesso.',
                agenda,
            });
        } catch (erro) {
            console.error('Erro ao salvar agenda:', erro);
            return res.status(500).json({
                erro: 'Erro ao salvar agenda.'
            });
        }
    },
};

module.exports = AgendaController;