const pool = require('../config/db');

const PRAZO_CONFIRMACAO_HORAS = 72;

async function confirmarConclusoesExpiradas({ servicoId = null } = {}) {
    const params = [];
    let filtroId = '';

    if (servicoId !== null && servicoId !== undefined) {
        params.push(Number(servicoId));
        filtroId = ' AND id = $1';
    }

    const resultado = await pool.query(
        `
        UPDATE servicos_solicitados
        SET status = 'concluido',
            conclusao_confirmada_em = CURRENT_TIMESTAMP,
            conclusao_confirmada_automaticamente = TRUE,
            atualizado_em = CURRENT_TIMESTAMP
        WHERE status = 'aguardando_confirmacao_cliente'
          AND conclusao_solicitada_em IS NOT NULL
          AND conclusao_solicitada_em
              <= CURRENT_TIMESTAMP - INTERVAL '${PRAZO_CONFIRMACAO_HORAS} hours'
          ${filtroId}
        RETURNING *;
        `,
        params
    );

    return resultado.rows;
}

module.exports = {
    PRAZO_CONFIRMACAO_HORAS,
    confirmarConclusoesExpiradas,
};
