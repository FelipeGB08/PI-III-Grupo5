const bcrypt = require('bcrypt');
const UserModel = require('../models/UserModel');
const { cidadePermitida, CIDADES_AMAUC } = require('../config/amaucCidades');
const {
    ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    buscarUsuarioPorRefreshToken,
    criarAccessToken,
    revogarRefreshToken,
} = require('../services/authTokenService');
const {
    criarRespostaLogin,
    montarRespostaUsuario,
} = require('../services/authResponseService');
const {
    normalizarListaCidades,
    normalizarPerfilTipo,
} = require('../utils/userRegistrationHelpers');

const AuthController = {
    registrarUsuario: async (req, res) => {
        try {
            const {
                nome,
                email,
                senha,
                telefone,
                cidade_amauc,
                cidade,
                endereco_principal,
                endereco,
                latitude,
                longitude,
                perfil_tipo,
                tipo_usuario,
                biografia,
                bio,
                categoria,
                categorias,
                cidades,
                cidades_atendidas,
            } = req.body;

            const cidadeInformada = cidade_amauc || cidade;
            const enderecoPrincipal = String(endereco_principal || endereco || '').trim();
            const latitudeInformada = latitude !== undefined && latitude !== ''
                ? Number(latitude)
                : undefined;
            const longitudeInformada = longitude !== undefined && longitude !== ''
                ? Number(longitude)
                : undefined;
            const perfilInformado = normalizarPerfilTipo(perfil_tipo || tipo_usuario);
            const emailNormalizado = String(email || '').trim().toLowerCase();
            const nomeNormalizado = String(nome || '').trim();
            const biografiaProfissional = String(biografia || bio || '').trim();
            const categoriaProfissional = Array.isArray(categorias)
                ? categorias[0]
                : (categoria || categorias);

            const cidadeValidada = cidadePermitida(cidadeInformada);
            if (!cidadeValidada) {
                return res.status(403).json({
                    erro: 'RF01 — Cadastro restrito à região AMAUC. Cidade informada não é permitida.',
                    cidades_permitidas: CIDADES_AMAUC,
                });
            }

            const usuarioExistente = await UserModel.buscarPorEmail(emailNormalizado);
            if (usuarioExistente) {
                return res.status(400).json({ erro: 'Este email já está em uso.' });
            }

            const salt = await bcrypt.genSalt(10);
            const senhaHash = await bcrypt.hash(senha, salt);

            const cidadesAtendidas = normalizarListaCidades(cidades_atendidas || cidades);
            const novoUsuario = perfilInformado === 'profissional'
                ? await UserModel.criarUsuarioProfissionalCompleto({
                    nome: nomeNormalizado,
                    email: emailNormalizado,
                    senhaHash,
                    telefone,
                    cidadeAmauc: cidadeValidada,
                    biografia: biografiaProfissional,
                    categoriaNome: categoriaProfissional,
                    cidadesAtendidas: cidadesAtendidas.length > 0
                        ? cidadesAtendidas
                        : [cidadeValidada],
                    enderecoPrincipal,
                    latitude: Number.isFinite(latitudeInformada)
                        ? latitudeInformada
                        : undefined,
                    longitude: Number.isFinite(longitudeInformada)
                        ? longitudeInformada
                        : undefined,
                })
                : await UserModel.criarUsuario(
                    nomeNormalizado,
                    emailNormalizado,
                    senhaHash,
                    telefone,
                    cidadeValidada,
                    perfilInformado,
                    {
                        endereco_principal: enderecoPrincipal,
                        latitude: Number.isFinite(latitudeInformada)
                            ? latitudeInformada
                            : undefined,
                        longitude: Number.isFinite(longitudeInformada)
                            ? longitudeInformada
                            : undefined,
                    }
                );

            return res.status(201).json({
                mensagem: 'Usuário cadastrado com sucesso!',
                usuario: montarRespostaUsuario(novoUsuario),
            });
        } catch (erro) {
            console.error('Erro no cadastro:', erro);
            if (erro.message === 'Categoria profissional invalida.') {
                return res.status(400).json({ erro: erro.message });
            }
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    loginUsuario: async (req, res) => {
        try {
            const { email, senha } = req.body;
            const emailNormalizado = String(email || '').trim().toLowerCase();

            const usuario = await UserModel.buscarPorEmail(emailNormalizado);
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

            return res.status(200).json(
                await criarRespostaLogin(usuario, 'Login realizado com sucesso!')
            );
        } catch (erro) {
            console.error('Erro no login:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    renovarSessao: async (req, res) => {
        try {
            const usuario = await buscarUsuarioPorRefreshToken(req.body.refresh_token);

            if (!usuario) {
                return res.status(401).json({
                    erro: 'Refresh token expirado, revogado ou invalido.',
                });
            }

            const accessToken = criarAccessToken(usuario);
            return res.status(200).json({
                mensagem: 'Sessao renovada com sucesso!',
                token: accessToken,
                access_token: accessToken,
                expires_in: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
                usuario: montarRespostaUsuario(usuario),
            });
        } catch (erro) {
            console.error('Erro ao renovar sessao:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    logout: async (req, res) => {
        try {
            await revogarRefreshToken(req.body.refresh_token);
            return res.status(200).json({ mensagem: 'Logout realizado com sucesso!' });
        } catch (erro) {
            console.error('Erro ao realizar logout:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },
};

module.exports = AuthController;
