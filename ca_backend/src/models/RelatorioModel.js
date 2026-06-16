const pool = require('../config/db');

const RelatorioModel = {
    obterEstatisticas: async () => {
        const queryDemandasPorCidade = `
            SELECT u.cidade_amauc AS municipio, COUNT(s.id) AS total_demandas
            FROM servicos_solicitados s
            JOIN usuarios u ON s.prof_id = u.id
            GROUP BY u.cidade_amauc;
        `;

        const queryStatus = `
            SELECT status, COUNT(id) AS quantidade
            FROM servicos_solicitados
            GROUP BY status;
        `;

        const demandas = await pool.query(queryDemandasPorCidade);
        const status = await pool.query(queryStatus);

        return {
            demandas_por_municipio: demandas.rows,
            resumo_status: status.rows,
        };
    },
};

module.exports = RelatorioModel;
