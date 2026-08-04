const pool = require('../config/db');
const AgendaModel = require('../models/AgendaModel');

function criarErro(status, mensagem) {
    const erro = new Error(mensagem);
    erro.status = status;
    return erro;
}

function pad(numero) {
    return String(numero).padStart(2, '0');
}

function partesAmaUc(data) {
    const partes = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(data);
    const valor = (tipo) => partes.find((parte) => parte.type === tipo)?.value;
    const dias = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
    return {
        diaSemana: dias[valor('weekday')],
        horario: `${pad(valor('hour'))}:${pad(valor('minute'))}`,
    };
}

async function validarAgendamento({
    profId,
    agendaServicoId,
    agendadoPara,
    categoria,
    categoriaId,
    ignorarSolicitacaoId = null,
}) {
    if (!agendaServicoId) {
        throw criarErro(400, 'agenda_servico_id é obrigatório para agendamento.');
    }

    if (!agendadoPara) {
        throw criarErro(400, 'agendado_para é obrigatório para agendamento.');
    }

    const dataAgendada = new Date(agendadoPara);
    if (Number.isNaN(dataAgendada.getTime())) {
        throw criarErro(400, 'Data ou horário de agendamento inválido.');
    }

    if (dataAgendada.getTime() <= Date.now()) {
        throw criarErro(400, 'Não é permitido agendar em horário passado.');
    }

    const servicoAgenda = await AgendaModel.buscarServicoAtivoDoProfissional(
        profId,
        agendaServicoId
    );

    if (!servicoAgenda) {
        throw criarErro(
            400,
            'Serviço da agenda não pertence ao profissional ou está inativo.'
        );
    }

    const { horario, diaSemana } = partesAmaUc(dataAgendada);
    const horarioAtivo = await AgendaModel.horarioAtivoDoProfissional(
        profId,
        diaSemana,
        horario
    );

    if (!horarioAtivo) {
        throw criarErro(400, 'Horário não está disponível na agenda do profissional.');
    }

    const agendadoParaNormalizado = dataAgendada.toISOString();

    const categoriaResult = await pool.query(
        `SELECT c.id
         FROM profissional_categorias pc
         JOIN categorias c ON c.id = pc.categoria_id
         WHERE pc.profissional_id = $1
           AND ($2::text IS NULL OR LOWER(c.nome_servico) = LOWER($2))
           AND ($3::int IS NULL OR c.id = $3::int)
         ORDER BY c.id`,
        [profId, categoria || null, categoriaId || null]
    );
    if (categoriaResult.rows.length !== 1) {
        throw criarErro(
            400,
            categoria
                ? 'A categoria informada nao pertence ao profissional.'
                : 'Informe a categoria contratada para este profissional.'
        );
    }

    const conflito = await pool.query(
        `
        SELECT id
        FROM servicos_solicitados
        WHERE prof_id = $1
          AND status IN ('pendente', 'proposta_valor', 'aceito', 'remarcacao_solicitada')
          AND (
            agendado_para = $2::timestamptz
            OR remarcacao_solicitada_para = $2::timestamptz
          )
          AND ($3::int IS NULL OR id <> $3::int)
        LIMIT 1;
        `,
        [profId, agendadoParaNormalizado, ignorarSolicitacaoId]
    );

    if (conflito.rows.length > 0) {
        throw criarErro(
            409,
            'Já existe uma solicitação para este profissional neste horário.'
        );
    }

    return {
        agenda_servico_id: servicoAgenda.id,
        categoria_id: categoriaResult.rows[0].id,
        servico_nome: servicoAgenda.nome,
        preco: Number(servicoAgenda.preco),
        duracao_minutos: Number(servicoAgenda.duracao_minutos),
        agendado_para: agendadoParaNormalizado,
    };
}

module.exports = {
    validarAgendamento,
};
