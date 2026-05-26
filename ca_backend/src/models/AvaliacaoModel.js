const pool = require('../config/db');

const AvaliacaoModel = {
    // 1. Salva a nota e o comentário no banco
    criar: async (solicitacao_id, cidadao_id, profissional_id, nota, comentario) => {
        const query = `
            INSERT INTO avaliacoes (solicitacao_id, cidadao_id, profissional_id, nota, comentario)
            VALUES ($1, $2, $3, $4, $5) RETURNING *;
        `;
        const resultado = await pool.query(query, [solicitacao_id, cidadao_id, profissional_id, nota, comentario]);
        return resultado.rows[0];
    },
    
    // 2. Busca todos os comentários do profissional para exibir no perfil
    buscarPorProfissional: async (profissional_id) => {
        const query = `
            SELECT a.*, u.nome as cidadao_nome
            FROM avaliacoes a
            JOIN usuarios u ON a.cidadao_id = u.id
            WHERE a.profissional_id = $1
            ORDER BY a.criado_em DESC;
        `;
        const resultado = await pool.query(query, [profissional_id]);
        return resultado.rows;
    },

    // 3. O banco de dados calcula a média de estrelas automaticamente!
    calcularMedia: async (profissional_id) => {
        const query = `SELECT ROUND(AVG(nota), 1) as media FROM avaliacoes WHERE profissional_id = $1;`;
        const resultado = await pool.query(query, [profissional_id]);
        return resultado.rows[0].media;
    }
};

module.exports = AvaliacaoModel;