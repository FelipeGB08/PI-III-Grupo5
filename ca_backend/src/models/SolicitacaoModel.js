const pool = require('../config/db');

const SolicitacaoModel = {
    // 1. Cidadão pede um orçamento
    criar: async (cidadao_id, profissional_id, descricao) => {
        const query = `
            INSERT INTO solicitacoes_orcamento (cidadao_id, profissional_id, descricao, status)
            VALUES ($1, $2, $3, 'pendente') RETURNING *;
        `;
        const resultado = await pool.query(query, [cidadao_id, profissional_id, descricao]);
        return resultado.rows[0];
    },
    
    // 2. Profissional vê quem chamou ele (COM FILTRO DINÂMICO)
    buscarPorProfissional: async (profissional_id, status = null) => {
        let query = `
            SELECT s.*, u.nome as cidadao_nome, u.email as cidadao_email
            FROM solicitacoes_orcamento s
            JOIN usuarios u ON s.cidadao_id = u.id
            WHERE s.profissional_id = $1
        `;
        const params = [profissional_id];

        // Se passar um status (ex: 'pendente'), filtra por ele
        if (status) {
            query += ` AND s.status = $2`;
            params.push(status);
        }

        query += ` ORDER BY s.data_solicitacao DESC;`;

        const resultado = await pool.query(query, params);
        return resultado.rows;
    },

    // 3. Cidadão vê seus próprios chamados
    buscarPorCidadao: async (cidadao_id) => {
        const query = `
            SELECT s.*, u.nome as profissional_nome
            FROM solicitacoes_orcamento s
            JOIN usuarios u ON s.profissional_id = u.id
            WHERE s.cidadao_id = $1
            ORDER BY s.data_solicitacao DESC;
        `;
        const resultado = await pool.query(query, [cidadao_id]);
        return resultado.rows;
    },

    // 4. Profissional aceita, recusa ou finaliza (COM ATUALIZAÇÃO DE PREÇO)
    atualizarStatus: async (id, profissional_id, status, preco) => {
        const query = `
            UPDATE solicitacoes_orcamento 
            SET status = COALESCE($1, status), 
                preco = COALESCE($2, preco),
                data_atualizacao = CURRENT_TIMESTAMP
            WHERE id = $3 AND profissional_id = $4 
            RETURNING *;
        `;
        const resultado = await pool.query(query, [status, preco, id, profissional_id]);
        return resultado.rows[0];
    }
};

module.exports = SolicitacaoModel;