const pool = require('../config/db');

const CategoriaModel = {
    listarTodas: async () => {
        const query = 'SELECT * FROM categorias ORDER BY nome_servico ASC;';
        const resultado = await pool.query(query);
        return resultado.rows;
    },

    buscarPorId: async (id) => {
        const query = 'SELECT * FROM categorias WHERE id = $1';
        const resultado = await pool.query(query, [id]);
        return resultado.rows[0];
    },

    buscarPorNome: async (nomeServico) => {
        const query = 'SELECT * FROM categorias WHERE nome_servico ILIKE $1';
        const resultado = await pool.query(query, [nomeServico]);
        return resultado.rows[0];
    },

    criar: async (nomeServico) => {
        const query = `
            INSERT INTO categorias (nome_servico)
            VALUES ($1)
            RETURNING *;
        `;
        const resultado = await pool.query(query, [nomeServico]);
        return resultado.rows[0];
    },

    atualizar: async (id, nomeServico) => {
        const query = `
            UPDATE categorias
            SET nome_servico = $2
            WHERE id = $1
            RETURNING *;
        `;
        const resultado = await pool.query(query, [id, nomeServico]);
        return resultado.rows[0];
    },

    deletar: async (id) => {
        const query = 'DELETE FROM categorias WHERE id = $1 RETURNING *;';
        const resultado = await pool.query(query, [id]);
        return resultado.rows[0];
    },
};

module.exports = CategoriaModel;
