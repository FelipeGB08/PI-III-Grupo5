const pool = require('../config/db');

const AvaliacaoModel = {
    criar: async (servicoId, notaEstrelas, comentario) => {
        const query = `
            INSERT INTO avaliacoes (servico_id, nota_estrelas, comentario)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const resultado = await pool.query(query, [servicoId, notaEstrelas, comentario || null]);
        return resultado.rows[0];
    },

    buscarPorServico: async (servicoId) => {
        const query = 'SELECT * FROM avaliacoes WHERE servico_id = $1';
        const resultado = await pool.query(query, [servicoId]);
        return resultado.rows[0];
    },

    buscarPorProfissional: async (profissionalId) => {
        const query = `
            SELECT a.*, s.descricao AS servico_descricao, u.nome AS cidadao_nome
            FROM avaliacoes a
            INNER JOIN servicos_solicitados s ON s.id = a.servico_id
            INNER JOIN usuarios u ON u.id = s.cidadao_id
            WHERE s.prof_id = $1
            ORDER BY a.criado_em DESC;
        `;
        const resultado = await pool.query(query, [profissionalId]);
        return resultado.rows;
    },

    calcularMedia: async (profissionalId) => {
        const query = `
            SELECT ROUND(AVG(a.nota_estrelas), 1) AS media
            FROM avaliacoes a
            INNER JOIN servicos_solicitados s ON s.id = a.servico_id
            WHERE s.prof_id = $1;
        `;
        const resultado = await pool.query(query, [profissionalId]);
        return resultado.rows[0].media;
    },
};

module.exports = AvaliacaoModel;
