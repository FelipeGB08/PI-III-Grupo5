const pool = require('../config/db');

const CategoriaModel = {
    listarTodas: async () => {
        const query = 'SELECT * FROM categorias ORDER BY nome ASC;';
        const resultado = await pool.query(query);
        return resultado.rows;
    },
    
    criar: async (nome, descricao) => {
        const query = 'INSERT INTO categorias (nome, descricao) VALUES ($1, $2) RETURNING *;';
        const resultado = await pool.query(query, [nome, descricao]);
        return resultado.rows[0];
    },
    
    deletar: async (id) => {
        const query = 'DELETE FROM categorias WHERE id = $1 RETURNING *;';
        const resultado = await pool.query(query, [id]);
        return resultado.rows[0];
    }
};

module.exports = CategoriaModel;