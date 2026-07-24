const AgendaModel = require('../models/AgendaModel');
const UserModel = require('../models/UserModel');
const {
    notificarFavoritosSobreNovosHorariosSemBloquear,
} = require('../services/notificationService');

function chaveHorario({ dia_semana, horario }) {
    return `${Number(dia_semana)}-${String(horario).slice(0, 5)}`;
}

function normalizarServico(item) {
    const nome = String(item?.nome || '').trim();
    const duracao = Number(item?.duracao_minutos ?? item?.duracaoMinutos);
    const preco = Number(item?.preco);

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
            const servicos = req.body.servicos.map(normalizarServico);

            const horarios = normalizarHorarios(req.body);

            const horariosAnteriores = await AgendaModel.listarHorariosAtivos(
                req.usuarioLogado.id
            );
            const chavesAnteriores = new Set(horariosAnteriores.map(chaveHorario));
            const chavesNovas = new Set();
            const novosHorarios = horarios.filter((horario) => {
                const chave = chaveHorario(horario);
                if (chavesAnteriores.has(chave) || chavesNovas.has(chave)) return false;
                chavesNovas.add(chave);
                return true;
            });

            const agenda = await AgendaModel.salvarParaProfissional(
                req.usuarioLogado.id,
                {
                    servicos,
                    horarios,
                }
            );

            if (novosHorarios.length > 0) {
                notificarFavoritosSobreNovosHorariosSemBloquear({
                    profissionalId: req.usuarioLogado.id,
                    profissionalNome: req.usuarioLogado.nome,
                    novosHorarios,
                });
            }

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
