const pool = require('../config/db');

const SolicitacaoModel = {
    // 1. Cidadão pede um orçamento
    criar: async (cidadao_id, profissional_id, descricao) => {
        const query = `
            INSERT INTO solicitacoes_orcamento (cidadao_id, profissional_id, descricao)
            VALUES ($1, $2, $3) RETURNING *;
        `;
        const resultado = await pool.query(query, [cidadao_id, profissional_id, descricao]);
        return resultado.rows[0];
    },
    
    // 2. Profissional vê quem chamou ele
    buscarPorProfissional: async (profissional_id) => {
        const query = `
            SELECT s.*, u.nome as cidadao_nome, u.email as cidadao_email
            FROM solicitacoes_orcamento s
            JOIN usuarios u ON s.cidadao_id = u.id
            WHERE s.profissional_id = $1
            ORDER BY s.data_solicitacao DESC;
        `;
        const resultado = await pool.query(query, [profissional_id]);
        return resultado.rows;
    },

    // 3. Profissional aceita, recusa ou finaliza
    atualizarStatus: async (id, profissional_id, status) => {
        const query = `
            UPDATE solicitacoes_orcamento SET status = $1
            WHERE id = $2 AND profissional_id = $3 RETURNING *;
        `;
        const resultado = await pool.query(query, [status, id, profissional_id]);
        return resultado.rows[0];
    }
};

module.exports = SolicitacaoModel;