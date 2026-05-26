const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');

const UserController = {
    // FUNÇÃO 1: REGISTRO
    registrarUsuario: async (req, res) => {
        try {
            console.log(" 1. Recebeu o pedido de REGISTRO no servidor!");
            const { nome, email, senha, tipo_usuario } = req.body;

            console.log(" 2. Dados recebidos:", email, tipo_usuario);
            
            if (!nome || !email || !senha || !tipo_usuario) {
                return res.status(400).json({ erro: 'Todos os campos são obrigatórios!' });
            }

            console.log(" 3. Indo verificar no Model se o email existe...");
            const usuarioExistente = await UserModel.buscarPorEmail(email);
            
            if (usuarioExistente) {
                return res.status(400).json({ erro: 'Este email já está em uso.' });
            }
            console.log(" 4. Passou pela verificação do banco! Criptografando senha...");

            const salt = await bcrypt.genSalt(10);
            const senhaCriptografada = await bcrypt.hash(senha, salt);

            console.log(" 5. Salvando no banco de dados...");
            const novoUsuario = await UserModel.criarUsuario(nome, email, senhaCriptografada, tipo_usuario);

            console.log(" 6. Usuário salvo com sucesso!");
            return res.status(201).json({
                mensagem: 'Usuário cadastrado com sucesso!',
                usuario: novoUsuario
            });

        } catch (erro) {
            console.error(' Erro no cadastro:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    }, // <-- Essa vírgula separa as duas funções!

    // FUNÇÃO 2: LOGIN
    loginUsuario: async (req, res) => {
        try {
            console.log(" 1. Recebeu o pedido de LOGIN no servidor!");
            const { email, senha } = req.body;

            if (!email || !senha) {
                return res.status(400).json({ erro: 'Email e senha são obrigatórios!' });
            }

            console.log(" 2. Buscando usuário no banco...");
            const usuario = await UserModel.buscarPorEmail(email);
            if (!usuario) {
                return res.status(401).json({ erro: 'Email ou senha incorretos.' }); 
            }

            console.log(" 3. Conferindo a senha...");
            const senhaValida = await bcrypt.compare(senha, usuario.senha);
            if (!senhaValida) {
                return res.status(401).json({ erro: 'Email ou senha incorretos.' });
            }

            console.log(" 4. Gerando Token JWT...");
            const token = jwt.sign(
                { id: usuario.id, tipo_usuario: usuario.tipo_usuario },
                process.env.JWT_SECRET,
                { expiresIn: '7d' } 
            );

            console.log("✅ 5. Login aprovado!");
            return res.status(200).json({
                mensagem: 'Login realizado com sucesso!',
                token: token,
                usuario: {
                    id: usuario.id,
                    nome: usuario.nome,
                    email: usuario.email,
                    tipo_usuario: usuario.tipo_usuario
                }
            });

        } catch (erro) {
            console.error(' Erro no login:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    }
};

module.exports = UserController;