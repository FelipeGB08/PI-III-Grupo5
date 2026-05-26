const pool = require('../config/db');

const UserModel = {
    // Função para buscar um usuário pelo email (verificar se o email já existe)
    buscarPorEmail: async (email) => {
        const query = 'SELECT * FROM usuarios WHERE email = $1';
        const result = await pool.query(query, [email]);
        return result.rows[0];
    },

    // Função para criar um novo usuário no banco
    criarUsuario: async (nome, email, senhaCriptografada, tipo_usuario) => {
        const query = `
            INSERT INTO usuarios (nome, email, senha, tipo_usuario) 
            VALUES ($1, $2, $3, $4) 
            RETURNING id, nome, email, tipo_usuario, criado_em;
        `;
        const values = [nome, email, senhaCriptografada, tipo_usuario];
        const result = await pool.query(query, values);
        return result.rows[0]; // Retorna os dados do usuário recém-criado (sem a senha)
    }
};

module.exports = UserModel;