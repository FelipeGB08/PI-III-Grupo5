const bcrypt = require('bcrypt');
const UserModel = require('../models/UserModel');
const logger = require('../utils/logger');
const { cidadePermitida, CIDADES_AMAUC } = require('../config/amaucCidades');
const {
    ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    buscarUsuarioPorRefreshToken,
    criarAccessToken,
    revogarRefreshToken,
} = require('../services/authTokenService');
const {
    desconectarSocketsDaSessao,
} = require('../services/chatSocketRegistry');
const {
    criarRespostaLogin,
    montarRespostaUsuario,
} = require('../services/authResponseService');
const {
    PERFIS_AUTOCADASTRO,
    normalizarListaCidades,
    normalizarPerfilTipo,
    possuiCidadeInvalida,
} = require('../utils/userRegistrationHelpers');
const { normalizarEmailIdentidade } = require('../utils/emailIdentity');

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
            const emailNormalizado = normalizarEmailIdentidade(email);
            const nomeNormalizado = String(nome || '').trim();
            const biografiaProfissional = String(biografia || bio || '').trim();
            const categoriaProfissional = Array.isArray(categorias)
                ? categorias[0]
                : (categoria || categorias);

            // Defesa em profundidade: nenhuma chamada direta ao controller pode
            // criar um usuario administrativo.
            if (!perfilInformado || !PERFIS_AUTOCADASTRO.has(perfilInformado)) {
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

            const usuarioExistente = await UserModel.buscarPorEmail(emailNormalizado);
            if (usuarioExistente) {
                return res.status(400).json({ erro: 'Este email já está em uso.' });
            }

            const salt = await bcrypt.genSalt(10);
            const senhaHash = await bcrypt.hash(senha, salt);

            const cidadesRecebidas = cidades_atendidas || cidades;
            const cidadesAtendidas = normalizarListaCidades(cidadesRecebidas);
            if (perfilInformado === 'profissional' && cidadesRecebidas !== undefined) {
                const quantidadeInformada = Array.isArray(cidadesRecebidas)
                    ? cidadesRecebidas.length
                    : String(cidadesRecebidas).split(',').filter((item) => item.trim()).length;
                if (quantidadeInformada === 0 || cidadesAtendidas.length === 0) {
                    return res.status(400).json({
                        erro: 'Selecione ao menos uma cidade atendida da regiao AMAUC.',
                    });
                }
                if (possuiCidadeInvalida(cidadesRecebidas)) {
                    return res.status(400).json({
                        erro: 'Todas as cidades atendidas devem pertencer a regiao AMAUC.',
                    });
                }
            }
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
            logger.error('Falha no cadastro.', {
                erro,
                componente: 'autenticacao',
                operacao: 'cadastro',
            });
            if (erro.message === 'Categoria profissional invalida.') {
                return res.status(400).json({ erro: erro.message });
            }
            if (erro.code === '23505') {
                return res.status(400).json({ erro: 'Este email já está em uso.' });
            }
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    loginUsuario: async (req, res) => {
        try {
            const { email, senha } = req.body;
            const emailNormalizado = normalizarEmailIdentidade(email);

            const usuario = await UserModel.buscarPorEmail(emailNormalizado);
            if (!usuario || usuario.ativo === false) {
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
            logger.error('Falha no login.', {
                erro,
                componente: 'autenticacao',
                operacao: 'login',
            });
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

            const accessToken = criarAccessToken(usuario, usuario.sessao_id);
            return res.status(200).json({
                mensagem: 'Sessao renovada com sucesso!',
                token: accessToken,
                access_token: accessToken,
                expires_in: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
                usuario: montarRespostaUsuario(usuario),
            });
        } catch (erro) {
            logger.error('Falha ao renovar sessao.', {
                erro,
                componente: 'autenticacao',
                operacao: 'refresh',
            });
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    logout: async (req, res) => {
        try {
            const sessaoRevogada = await revogarRefreshToken(req.body.refresh_token);
            if (sessaoRevogada) {
                desconectarSocketsDaSessao(
                    sessaoRevogada.id,
                    'Sessao encerrada por logout.'
                );
            }
            return res.status(200).json({ mensagem: 'Logout realizado com sucesso!' });
        } catch (erro) {
            logger.error('Falha ao realizar logout.', {
                erro,
                componente: 'autenticacao',
                operacao: 'logout',
            });
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },
};

module.exports = AuthController;
