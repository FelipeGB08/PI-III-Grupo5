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

function formatarTimestampLocal(data) {
    return [
        data.getFullYear(),
        pad(data.getMonth() + 1),
        pad(data.getDate()),
    ].join('-') + `T${pad(data.getHours())}:${pad(data.getMinutes())}:00`;
}

function extrairHorario(valor, data) {
    const texto = String(valor || '');
    const match = texto.match(/[T\s](\d{2}:\d{2})(?::\d{2})?/);
    if (match) return match[1];
    return `${pad(data.getHours())}:${pad(data.getMinutes())}`;
}

function diaSemanaAmaUc(data) {
    const diaJs = data.getDay();
    return diaJs === 0 ? 7 : diaJs;
}

async function validarAgendamento({
    profId,
    agendaServicoId,
    agendadoPara,
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

    const horario = extrairHorario(agendadoPara, dataAgendada);
    const diaSemana = diaSemanaAmaUc(dataAgendada);
    const horarioAtivo = await AgendaModel.horarioAtivoDoProfissional(
        profId,
        diaSemana,
        horario
    );

    if (!horarioAtivo) {
        throw criarErro(400, 'Horário não está disponível na agenda do profissional.');
    }

    const agendadoParaNormalizado = formatarTimestampLocal(dataAgendada);

    const conflito = await pool.query(
        `
        SELECT id
        FROM servicos_solicitados
        WHERE prof_id = $1
          AND status IN ('pendente', 'aceito', 'remarcacao_solicitada')
          AND (
            agendado_para = $2::timestamp
            OR remarcacao_solicitada_para = $2::timestamp
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
        servico_nome: servicoAgenda.nome,
        preco: Number(servicoAgenda.preco),
        duracao_minutos: Number(servicoAgenda.duracao_minutos),
        agendado_para: agendadoParaNormalizado,
    };
}

module.exports = {
    validarAgendamento,
};
