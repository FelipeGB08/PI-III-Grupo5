const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');
const { cidadePermitida, CIDADES_AMAUC } = require('../config/amaucCidades');

function normalizarPerfilTipo(valor) {
    if (!valor) return null;
    const mapa = {
        cidadao: 'cidadao',
        cidadão: 'cidadao',
        profissional: 'profissional',
        admin: 'admin',
    };
    return mapa[String(valor).toLowerCase()] || null;
}

function montarPayloadJwt(usuario) {
    return {
        id: usuario.id,
        perfil_tipo: usuario.perfil_tipo,
        tipo_usuario: usuario.perfil_tipo,
    };
}

function montarRespostaUsuario(usuario) {
    return {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        telefone: usuario.telefone,
        cidade_amauc: usuario.cidade_amauc,
        perfil_tipo: usuario.perfil_tipo,
        tipo_usuario: usuario.perfil_tipo,
        foto_url: usuario.foto_url || null,
    };
}

const UserController = {
    registrarUsuario: async (req, res) => {
        try {
            const {
                nome,
                email,
                senha,
                telefone,
                cidade_amauc,
                cidade,
                perfil_tipo,
                tipo_usuario,
            } = req.body;

            const cidadeInformada = cidade_amauc || cidade;
            const perfilInformado = normalizarPerfilTipo(perfil_tipo || tipo_usuario);

            if (!nome || !email || !senha || !cidadeInformada || !perfilInformado) {
                return res.status(400).json({
                    erro: 'Campos obrigatórios: nome, email, senha, cidade_amauc e perfil_tipo.',
                });
            }

            if (!['cidadao', 'profissional'].includes(perfilInformado)) {
                return res.status(400).json({
                    erro: 'perfil_tipo deve ser "cidadao" ou "profissional".',
                });
            }

            const cidadeValidada = cidadePermitida(cidadeInformada);
            if (!cidadeValidada) {
                return res.status(403).json({
                    erro: 'RF01 — Cadastro restrito à região AMAUC. Cidade informada não é permitida.',
                    cidades_permitidas: CIDADES_AMAUC,
                });
            }

            const usuarioExistente = await UserModel.buscarPorEmail(email);
            if (usuarioExistente) {
                return res.status(400).json({ erro: 'Este email já está em uso.' });
            }

            const salt = await bcrypt.genSalt(10);
            const senhaHash = await bcrypt.hash(senha, salt);

            const novoUsuario = await UserModel.criarUsuario(
                nome,
                email,
                senhaHash,
                telefone,
                cidadeValidada,
                perfilInformado
            );

            return res.status(201).json({
                mensagem: 'Usuário cadastrado com sucesso!',
                usuario: montarRespostaUsuario(novoUsuario),
            });
        } catch (erro) {
            console.error('Erro no cadastro:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    buscarMeuPerfil: async (req, res) => {
        try {
            const usuario = await UserModel.buscarPorId(req.usuarioLogado.id);
            if (!usuario) {
                return res.status(404).json({ erro: 'Usuário não encontrado.' });
            }
            return res.status(200).json(montarRespostaUsuario(usuario));
        } catch (erro) {
            console.error('Erro ao buscar perfil:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    atualizarMeuPerfil: async (req, res) => {
        try {
            const { nome, telefone, foto_url } = req.body;
            const nomeTrim = typeof nome === 'string' ? nome.trim() : undefined;
            if (nomeTrim !== undefined && nomeTrim.length < 2) {
                return res.status(400).json({ erro: 'Nome deve ter ao menos 2 caracteres.' });
            }

            const usuarioAtualizado = await UserModel.atualizarPerfil(req.usuarioLogado.id, {
                nome: nomeTrim,
                telefone: telefone !== undefined ? telefone : undefined,
                foto_url: foto_url !== undefined ? foto_url : undefined,
            });

            return res.status(200).json({
                mensagem: 'Perfil atualizado com sucesso!',
                usuario: montarRespostaUsuario(usuarioAtualizado),
            });
        } catch (erro) {
            console.error('Erro ao atualizar perfil:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    loginUsuario: async (req, res) => {
        try {
            const { email, senha } = req.body;

            if (!email || !senha) {
                return res.status(400).json({ erro: 'Email e senha são obrigatórios!' });
            }

            const usuario = await UserModel.buscarPorEmail(email);
            if (!usuario) {
                return res.status(401).json({ erro: 'Email ou senha incorretos.' });
            }

            const senhaHash = usuario.senha_hash;
            if (!senhaHash) {
                return res.status(401).json({ erro: 'Email ou senha incorretos.' });
            }

            const isMatch = await bcrypt.compare(senha, senhaHash);
            if (!isMatch) { 
                return res.status(401).json({ erro: 'Email ou senha incorretos.' });
            }

            const token = jwt.sign(
                montarPayloadJwt(usuario),
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            return res.status(200).json({
                mensagem: 'Login realizado com sucesso!',
                token,
                usuario: montarRespostaUsuario(usuario),
            });
        } catch (erro) {
            console.error('Erro no login:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    solicitarMagicLink: async (req, res) => {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ erro: 'Email Ã© obrigatÃ³rio.' });
            }

            return res.status(202).json({
                mensagem: 'Se o email estiver cadastrado, enviaremos um link de acesso.',
            });
        } catch (erro) {
            console.error('Erro ao solicitar magic link:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },
};

module.exports = UserController;
