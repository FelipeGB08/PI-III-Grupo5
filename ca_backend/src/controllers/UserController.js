const bcrypt = require('bcrypt');
const crypto = require('crypto');
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

function criarErroHttp(status, mensagem) {
    const erro = new Error(mensagem);
    erro.status = status;
    return erro;
}

function exigirEnv(nome) {
    const valor = process.env[nome];
    if (!valor) {
        throw criarErroHttp(500, `${nome} não configurado no servidor.`);
    }
    return valor;
}

function decodificarJwtHeader(token) {
    const [header] = String(token || '').split('.');
    if (!header) throw criarErroHttp(401, 'Token social mal formatado.');
    return JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
}

async function buscarJson(url, options = {}) {
    const resposta = await fetch(url, options);
    if (!resposta.ok) {
        throw criarErroHttp(401, 'Não foi possível validar o token social.');
    }
    return resposta.json();
}

async function buscarChavePublica(jwksUrl, kid) {
    const jwks = await buscarJson(jwksUrl);
    const jwk = jwks.keys?.find((key) => key.kid === kid);
    if (!jwk) {
        throw criarErroHttp(401, 'Chave pública do token social não encontrada.');
    }
    return crypto
        .createPublicKey({ key: jwk, format: 'jwk' })
        .export({ type: 'spki', format: 'pem' });
}

async function verificarJwtSocial({ token, jwksUrl, issuer, audience }) {
    const header = decodificarJwtHeader(token);
    const publicKey = await buscarChavePublica(jwksUrl, header.kid);
    return jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer,
        audience,
    });
}

async function verificarTokenSocial(provider, token) {
    if (!token) {
        throw criarErroHttp(400, 'Token do provedor social é obrigatório.');
    }

    if (provider === 'google') {
        const claims = await verificarJwtSocial({
            token,
            jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
            issuer: 'https://accounts.google.com',
            audience: exigirEnv('GOOGLE_CLIENT_ID'),
        });
        return {
            providerId: claims.sub,
            email: claims.email,
            nome: claims.name || claims.email?.split('@')[0],
            fotoUrl: claims.picture || null,
        };
    }

    if (provider === 'apple') {
        const claims = await verificarJwtSocial({
            token,
            jwksUrl: 'https://appleid.apple.com/auth/keys',
            issuer: 'https://appleid.apple.com',
            audience: exigirEnv('APPLE_CLIENT_ID'),
        });
        return {
            providerId: claims.sub,
            email: claims.email || `${claims.sub}@apple.local`,
            nome: claims.name || 'Usuário Apple',
            fotoUrl: null,
        };
    }

    if (provider === 'github') {
        const headers = {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'Conecta-AMAUC',
        };
        const perfil = await buscarJson('https://api.github.com/user', { headers });
        const emails = await buscarJson('https://api.github.com/user/emails', { headers });
        const principal = emails.find((item) => item.primary && item.verified) ||
            emails.find((item) => item.verified);

        if (!principal?.email && !perfil.email) {
            throw criarErroHttp(401, 'Token GitHub válido, mas sem e-mail verificado.');
        }

        return {
            providerId: String(perfil.id),
            email: principal?.email || perfil.email,
            nome: perfil.name || perfil.login,
            fotoUrl: perfil.avatar_url || null,
        };
    }

    throw criarErroHttp(400, 'provider deve ser google, apple ou github.');
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

    loginSocial: async (req, res) => {
        try {
            const {
                provider,
                token,
                id_token,
                access_token,
                cidade_amauc,
                cidade,
            } = req.body;

            const providerNormalizado = String(provider || '').toLowerCase();
            const tokenSocial = token || id_token || access_token;
            const perfilSocial = await verificarTokenSocial(providerNormalizado, tokenSocial);
            const emailNormalizado = String(perfilSocial.email || '').trim().toLowerCase();

            let usuario = await UserModel.buscarPorEmail(emailNormalizado);

            if (!usuario) {
                const cidadeInformada = cidade_amauc || cidade;
                const cidadeValidada = cidadePermitida(cidadeInformada);
                if (!cidadeValidada) {
                    return res.status(403).json({
                        erro: 'RF01 — Cadastro social restrito à região AMAUC. Informe uma cidade permitida.',
                        cidades_permitidas: CIDADES_AMAUC,
                    });
                }

                const nomeSocial = String(perfilSocial.nome || emailNormalizado.split('@')[0]).trim();
                const senhaSocialHash = await bcrypt.hash(
                    `${providerNormalizado}:${perfilSocial.providerId || emailNormalizado}:${Date.now()}`,
                    10
                );

                usuario = await UserModel.criarUsuario(
                    nomeSocial.length >= 2 ? nomeSocial : 'Usuário AMAUC',
                    emailNormalizado,
                    senhaSocialHash,
                    null,
                    cidadeValidada,
                    'cidadao'
                );
            }

            const token = jwt.sign(
                montarPayloadJwt(usuario),
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            return res.status(200).json({
                mensagem: `Login com ${providerNormalizado} realizado com sucesso!`,
                token,
                usuario: {
                    ...montarRespostaUsuario(usuario),
                    foto_url: usuario.foto_url || perfilSocial.fotoUrl || null,
                },
            });
        } catch (erro) {
            console.error('Erro no login social:', erro);
            return res.status(erro.status || 500).json({
                erro: erro.status ? erro.message : 'Erro interno no servidor.',
            });
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
