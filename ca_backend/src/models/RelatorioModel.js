const pool = require('../config/db');

const RelatorioModel = {
    obterEstatisticas: async () => {
        // Agora vai funcionar, pois a coluna 'cidade' existe no banco!
        const queryDemandasPorCidade = `
            SELECT u.cidade AS municipio, COUNT(s.id) AS total_demandas
            FROM solicitacoes_orcamento s
            JOIN usuarios u ON s.profissional_id = u.id
            GROUP BY u.cidade;
        `;

        const queryStatus = `
            SELECT status, COUNT(id) AS quantidade
            FROM solicitacoes_orcamento
            GROUP BY status;
        `;

        const demandas = await pool.query(queryDemandasPorCidade);
        const status = await pool.query(queryStatus);

        return {
            demandas_por_municipio: demandas.rows,
            resumo_status: status.rows
        };
    }
};

module.exports = RelatorioModel;