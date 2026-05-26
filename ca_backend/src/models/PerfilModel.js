const pool = require('../config/db');

const PerfilModel = {
    criarPerfil: async (usuario_id, bio, telefone_comercial, cidade, categoria) => {
        const query = `
            INSERT INTO perfil_profissional (usuario_id, bio, telefone_comercial, cidade, categoria)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const values = [usuario_id, bio, telefone_comercial, cidade, categoria];
        const resultado = await pool.query(query, values);
        return resultado.rows[0];
    },

    buscarPorUsuarioId: async (usuario_id) => {
        const query = 'SELECT * FROM perfil_profissional WHERE usuario_id = $1';
        const resultado = await pool.query(query, [usuario_id]);
        return resultado.rows[0];
    }, // <-- Não esqueça desta vírgula!

    // NOVA FUNÇÃO: Listar profissionais com filtros
    listarTodos: async (filtros) => {
        // Usamos um JOIN para pegar os dados do perfil E o nome do usuário na mesma tacada
        let query = `
            SELECT p.*, u.nome, u.email 
            FROM perfil_profissional p
            JOIN usuarios u ON p.usuario_id = u.id
            WHERE 1=1
        `;
        const values = [];
        let contador = 1;

        // Se o cliente filtrou por categoria...
        if (filtros.categoria) {
            query += ` AND p.categoria = $${contador}`;
            values.push(filtros.categoria);
            contador++;
        }

        // Se o cliente filtrou por cidade...
        if (filtros.cidade) {
            query += ` AND p.cidade = $${contador}`;
            values.push(filtros.cidade);
            contador++;
        }

        const resultado = await pool.query(query, values);
        return resultado.rows;
    }
};

module.exports = PerfilModel;