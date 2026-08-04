const pool = require('../config/db');

const DEFAULT_SERVICOS = [
    { nome: 'Visita Tecnica', duracao_minutos: 40, preco: 80, ativo: true, ordem: 0 },
    { nome: 'Servico Residencial', duracao_minutos: 60, preco: 120, ativo: true, ordem: 1 },
    { nome: 'Orcamento no local', duracao_minutos: 30, preco: 50, ativo: true, ordem: 2 },
];

const DEFAULT_HORARIOS = [
    { dia_semana: 1, horario: '09:00' },
    { dia_semana: 1, horario: '10:30' },
    { dia_semana: 1, horario: '14:00' },
    { dia_semana: 1, horario: '15:30' },
    { dia_semana: 2, horario: '09:00' },
    { dia_semana: 2, horario: '10:30' },
    { dia_semana: 2, horario: '14:00' },
    { dia_semana: 2, horario: '15:30' },
    { dia_semana: 3, horario: '09:00' },
    { dia_semana: 3, horario: '10:30' },
    { dia_semana: 3, horario: '14:00' },
    { dia_semana: 3, horario: '15:30' },
    { dia_semana: 4, horario: '09:00' },
    { dia_semana: 4, horario: '10:30' },
    { dia_semana: 4, horario: '14:00' },
    { dia_semana: 4, horario: '15:30' },
    { dia_semana: 5, horario: '09:00' },
    { dia_semana: 5, horario: '10:30' },
    { dia_semana: 5, horario: '14:00' },
    { dia_semana: 5, horario: '15:30' },
];

function normalizarHorario(horario) {
    const texto = String(horario || '').trim();
    const match = texto.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    return match ? `${match[1]}:${match[2]}` : null;
}

function montarAgenda(servicos, horarios, usarPadrao = false) {
    const horariosAtivos = horarios.filter((item) => item.ativo !== false);
    const diasSemana = [...new Set(horariosAtivos.map((item) => Number(item.dia_semana)))]
        .sort((a, b) => a - b);

    return {
        usando_padrao: usarPadrao,
        servicos: servicos
            .filter((item) => item.ativo !== false)
            .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0))
            .map((item) => ({
                id: item.id || null,
                nome: item.nome,
                duracao_minutos: Number(item.duracao_minutos),
                preco: Number(item.preco),
                ativo: item.ativo !== false,
                ordem: Number(item.ordem || 0),
            })),
        horarios: horariosAtivos
            .map((item) => ({
                dia_semana: Number(item.dia_semana),
                horario: String(item.horario).slice(0, 5),
            }))
            .sort((a, b) => a.dia_semana - b.dia_semana || a.horario.localeCompare(b.horario)),
        dias_semana: diasSemana,
    };
}

async function criarAgendaPadrao(profissionalId, client) {
    for (const servico of DEFAULT_SERVICOS) {
        await client.query(
            `INSERT INTO profissional_agenda_servicos
             (profissional_id, nome, duracao_minutos, preco, ativo, ordem)
             VALUES ($1, $2, $3, $4, TRUE, $5)`,
            [
                profissionalId,
                servico.nome,
                servico.duracao_minutos,
                servico.preco,
                servico.ordem,
            ]
        );
    }

    for (const horario of DEFAULT_HORARIOS) {
        await client.query(
            `INSERT INTO profissional_agenda_horarios
             (profissional_id, dia_semana, horario, ativo)
             VALUES ($1, $2, $3, TRUE)`,
            [profissionalId, horario.dia_semana, horario.horario]
        );
    }
}

async function buscarRegistrosAgenda(profissionalId, client = pool) {
    const [servicosResult, horariosResult] = await Promise.all([
        client.query(
            `SELECT id, nome, duracao_minutos, preco, ativo, ordem
             FROM profissional_agenda_servicos
             WHERE profissional_id = $1
             ORDER BY ordem ASC, id ASC`,
            [profissionalId]
        ),
        client.query(
            `SELECT dia_semana, horario, ativo
             FROM profissional_agenda_horarios
             WHERE profissional_id = $1
             ORDER BY dia_semana ASC, horario ASC`,
            [profissionalId]
        ),
    ]);

    return {
        servicos: servicosResult.rows,
        horarios: horariosResult.rows,
    };
}

const AgendaModel = {
    // A agenda exibida ao cidadao precisa sempre apontar para servicos reais,
    // pois o agendamento referencia o ID imutavel do servico escolhido.
    criarAgendaPadraoParaProfissional: async (profissionalId, client) => {
        if (!client?.query) {
            throw new TypeError('Uma conexao de banco valida e obrigatoria.');
        }
        await criarAgendaPadrao(profissionalId, client);
    },

    // Instala a agenda inicial para contas antigas que foram criadas antes de
    // existir a persistencia da agenda. O lock transacional evita duplicacao
    // quando duas consultas publicas acontecem simultaneamente.
    garantirAgendaPadraoParaProfissional: async (profissionalId) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('SELECT pg_advisory_xact_lock($1::bigint)', [profissionalId]);

            const agenda = await buscarRegistrosAgenda(profissionalId, client);
            if (agenda.servicos.length === 0 && agenda.horarios.length === 0) {
                await criarAgendaPadrao(profissionalId, client);
            }

            await client.query('COMMIT');
        } catch (erro) {
            await client.query('ROLLBACK');
            throw erro;
        } finally {
            client.release();
        }
    },

    buscarPorProfissional: async (profissionalId, { fallbackPadrao = true } = {}) => {
        let agenda = await buscarRegistrosAgenda(profissionalId);
        const temConfig = agenda.servicos.length > 0 || agenda.horarios.length > 0;
        if (!temConfig && fallbackPadrao) {
            await AgendaModel.garantirAgendaPadraoParaProfissional(profissionalId);
            agenda = await buscarRegistrosAgenda(profissionalId);
        }

        return montarAgenda(agenda.servicos, agenda.horarios, false);
    },

    listarHorariosAtivos: async (profissionalId) => {
        const result = await pool.query(
            `SELECT dia_semana, horario
             FROM profissional_agenda_horarios
             WHERE profissional_id = $1
               AND ativo = TRUE
             ORDER BY dia_semana ASC, horario ASC`,
            [profissionalId]
        );

        return result.rows.map((item) => ({
            dia_semana: Number(item.dia_semana),
            horario: String(item.horario).slice(0, 5),
        }));
    },

    salvarParaProfissional: async (profissionalId, { servicos, horarios }) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM profissional_agenda_servicos WHERE profissional_id = $1', [profissionalId]);
            await client.query('DELETE FROM profissional_agenda_horarios WHERE profissional_id = $1', [profissionalId]);

            for (const [index, servico] of servicos.entries()) {
                await client.query(
                    `INSERT INTO profissional_agenda_servicos
                     (profissional_id, nome, duracao_minutos, preco, ativo, ordem)
                     VALUES ($1, $2, $3, $4, TRUE, $5)`,
                    [
                        profissionalId,
                        servico.nome,
                        servico.duracao_minutos,
                        servico.preco,
                        index,
                    ]
                );
            }

            for (const item of horarios) {
                await client.query(
                    `INSERT INTO profissional_agenda_horarios
                     (profissional_id, dia_semana, horario, ativo)
                     VALUES ($1, $2, $3, TRUE)
                     ON CONFLICT (profissional_id, dia_semana, horario)
                     DO UPDATE SET ativo = EXCLUDED.ativo`,
                    [profissionalId, item.dia_semana, item.horario]
                );
            }

            await client.query('COMMIT');
            return AgendaModel.buscarPorProfissional(profissionalId, { fallbackPadrao: false });
        } catch (erro) {
            await client.query('ROLLBACK');
            throw erro;
        } finally {
            client.release();
        }
    },

    buscarServicoAtivoDoProfissional: async (profissionalId, agendaServicoId) => {
        const resultado = await pool.query(
            `SELECT id, profissional_id, nome, duracao_minutos, preco, ativo
             FROM profissional_agenda_servicos
             WHERE id = $1
               AND profissional_id = $2
               AND ativo = TRUE`,
            [agendaServicoId, profissionalId]
        );

        return resultado.rows[0] || null;
    },

    horarioAtivoDoProfissional: async (profissionalId, diaSemana, horario) => {
        const horarioNormalizado = normalizarHorario(horario);
        if (!horarioNormalizado) return false;

        const resultado = await pool.query(
            `SELECT 1
             FROM profissional_agenda_horarios
             WHERE profissional_id = $1
               AND dia_semana = $2
               AND horario = $3::time
               AND ativo = TRUE
             LIMIT 1`,
            [profissionalId, diaSemana, horarioNormalizado]
        );

        return resultado.rows.length > 0;
    },

    normalizarHorario,
};

module.exports = AgendaModel;
