const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');
const { cidadePermitida, CIDADES_AMAUC } = require('../config/amaucCidades');
const {
    enviarMagicLink,
    enviarResetSenha,
} = require('../services/emailService');

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

function normalizarListaCidades(cidades) {
    if (!cidades) return [];
    const lista = Array.isArray(cidades)
        ? cidades
        : String(cidades)
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);

    const validadas = [];
    for (const cidade of lista) {
        const cidadeValidada = cidadePermitida(cidade);
        if (cidadeValidada && !validadas.includes(cidadeValidada)) {
            validadas.push(cidadeValidada);
        }
    }
    return validadas;
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

const magicLinkTokens = new Map();
const passwordResetTokens = new Map();

function ambienteDesenvolvimento() {
    return process.env.NODE_ENV !== 'production';
}

function gerarTokenSeguro() {
    return crypto.randomBytes(32).toString('base64url');
}

function hashToken(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function expiraEmMinutos(minutos) {
    return Date.now() + minutos * 60 * 1000;
}

function limparExpirados(store) {
    const agora = Date.now();
    for (const [hash, dados] of store.entries()) {
        if (dados.expiraEm <= agora) {
            store.delete(hash);
        }
    }
}

function criarRespostaLogin(usuario, mensagem) {
    const token = jwt.sign(
        montarPayloadJwt(usuario),
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    return {
        mensagem,
        token,
        usuario: montarRespostaUsuario(usuario),
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
            issuer: ['https://accounts.google.com', 'accounts.google.com'],
            audience: exigirEnv('GOOGLE_CLIENT_ID'),
        });
        if (claims.email_verified !== true && claims.email_verified !== 'true') {
            throw criarErroHttp(401, 'Token Google válido, mas e-mail não verificado.');
        }
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
        if (!claims.email) {
            throw criarErroHttp(401, 'Token Apple válido, mas sem e-mail.');
        }
        return {
            providerId: claims.sub,
            email: claims.email,
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
                biografia,
                bio,
                categoria,
                categorias,
                cidades,
                cidades_atendidas,
            } = req.body;

            const cidadeInformada = cidade_amauc || cidade;
            const perfilInformado = normalizarPerfilTipo(perfil_tipo || tipo_usuario);
            const emailNormalizado = String(email || '').trim().toLowerCase();
            const nomeNormalizado = String(nome || '').trim();
            const biografiaProfissional = String(biografia || bio || '').trim();
            const categoriaProfissional = Array.isArray(categorias)
                ? categorias[0]
                : (categoria || categorias);

            if (!nomeNormalizado || !emailNormalizado || !senha || !cidadeInformada || !perfilInformado) {
                return res.status(400).json({
                    erro: 'Campos obrigatórios: nome, email, senha, cidade_amauc e perfil_tipo.',
                });
            }

            if (!['cidadao', 'profissional'].includes(perfilInformado)) {
                return res.status(400).json({
                    erro: 'perfil_tipo deve ser "cidadao" ou "profissional".',
                });
            }

            if (perfilInformado === 'profissional') {
                if (biografiaProfissional.length < 10) {
                    return res.status(400).json({
                        erro: 'Para cadastro profissional, a biografia deve ter pelo menos 10 caracteres.',
                    });
                }

                if (!categoriaProfissional) {
                    return res.status(400).json({
                        erro: 'Para cadastro profissional, informe ao menos uma categoria.',
                    });
                }
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
                })
                : await UserModel.criarUsuario(
                    nomeNormalizado,
                    emailNormalizado,
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
            if (erro.message === 'Categoria profissional invalida.') {
                return res.status(400).json({ erro: erro.message });
            }
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
            const emailNormalizado = String(email || '').trim().toLowerCase();

            if (!emailNormalizado || !senha) {
                return res.status(400).json({ erro: 'Email e senha são obrigatórios!' });
            }

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
                criarRespostaLogin(usuario, 'Login realizado com sucesso!')
            );
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

            const jwtToken = jwt.sign(
                montarPayloadJwt(usuario),
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            return res.status(200).json({
                mensagem: `Login com ${providerNormalizado} realizado com sucesso!`,
                token: jwtToken,
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

    renovarSessao: async (req, res) => {
        try {
            const usuario = await UserModel.buscarPorId(req.usuarioLogado.id);

            if (!usuario) {
                return res.status(404).json({ erro: 'Usuario nao encontrado.' });
            }

            return res.status(200).json(
                criarRespostaLogin(usuario, 'Sessao renovada com sucesso!')
            );
        } catch (erro) {
            console.error('Erro ao renovar sessao:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    solicitarMagicLink: async (req, res) => {
        try {
            const { email } = req.body;
            const emailNormalizado = String(email || '').trim().toLowerCase();

            if (!emailNormalizado) {
                return res.status(400).json({ erro: 'Email e obrigatorio.' });
            }

            limparExpirados(magicLinkTokens);
            const usuario = await UserModel.buscarPorEmail(emailNormalizado);
            const resposta = {
                mensagem: 'Se o email estiver cadastrado, enviaremos um link de acesso.',
            };

            if (usuario) {
                const token = gerarTokenSeguro();
                magicLinkTokens.set(hashToken(token), {
                    usuarioId: usuario.id,
                    expiraEm: expiraEmMinutos(15),
                });

                const enviado = await enviarMagicLink(emailNormalizado, token);
                if (!enviado && !ambienteDesenvolvimento()) {
                    return res.status(500).json({
                        erro: 'Servidor de email nao configurado para magic link.',
                    });
                }

                if (!enviado && ambienteDesenvolvimento()) {
                    resposta.dev_token = token;
                    console.info(`[DEV] Magic link token para ${emailNormalizado}: ${token}`);
                }

                if (enviado) {
                    resposta.email_enviado = true;
                }
            }

            return res.status(202).json(resposta);
        } catch (erro) {
            console.error('Erro ao solicitar magic link:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    verificarMagicLink: async (req, res) => {
        try {
            const { token } = req.body;
            const tokenInformado = String(token || '').trim();

            if (!tokenInformado) {
                return res.status(400).json({ erro: 'Token e obrigatorio.' });
            }

            limparExpirados(magicLinkTokens);
            const tokenHash = hashToken(tokenInformado);
            const dados = magicLinkTokens.get(tokenHash);

            if (!dados || dados.expiraEm <= Date.now()) {
                magicLinkTokens.delete(tokenHash);
                return res.status(401).json({ erro: 'Link expirado ou invalido.' });
            }

            const usuario = await UserModel.buscarPorId(dados.usuarioId);
            magicLinkTokens.delete(tokenHash);

            if (!usuario) {
                return res.status(404).json({ erro: 'Usuario nao encontrado.' });
            }

            return res.status(200).json(
                criarRespostaLogin(usuario, 'Login sem senha realizado com sucesso!')
            );
        } catch (erro) {
            console.error('Erro ao verificar magic link:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    solicitarResetSenha: async (req, res) => {
        try {
            const { email } = req.body;
            const emailNormalizado = String(email || '').trim().toLowerCase();

            if (!emailNormalizado) {
                return res.status(400).json({ erro: 'Email e obrigatorio.' });
            }

            limparExpirados(passwordResetTokens);
            const usuario = await UserModel.buscarPorEmail(emailNormalizado);
            const resposta = {
                mensagem: 'Se o email estiver cadastrado, enviaremos instrucoes para redefinir a senha.',
            };

            if (usuario) {
                const token = gerarTokenSeguro();
                passwordResetTokens.set(hashToken(token), {
                    usuarioId: usuario.id,
                    expiraEm: expiraEmMinutos(30),
                });

                const enviado = await enviarResetSenha(emailNormalizado, token);
                if (!enviado && !ambienteDesenvolvimento()) {
                    return res.status(500).json({
                        erro: 'Servidor de email nao configurado para reset de senha.',
                    });
                }

                if (!enviado && ambienteDesenvolvimento()) {
                    resposta.dev_token = token;
                    console.info(`[DEV] Reset de senha token para ${emailNormalizado}: ${token}`);
                }

                if (enviado) {
                    resposta.email_enviado = true;
                }
            }

            return res.status(202).json(resposta);
        } catch (erro) {
            console.error('Erro ao solicitar reset de senha:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    confirmarResetSenha: async (req, res) => {
        try {
            const { token, senha } = req.body;
            const tokenInformado = String(token || '').trim();

            if (!tokenInformado || !senha) {
                return res.status(400).json({ erro: 'Token e nova senha sao obrigatorios.' });
            }

            if (String(senha).length < 6) {
                return res.status(400).json({ erro: 'A senha deve ter ao menos 6 caracteres.' });
            }

            limparExpirados(passwordResetTokens);
            const tokenHash = hashToken(tokenInformado);
            const dados = passwordResetTokens.get(tokenHash);

            if (!dados || dados.expiraEm <= Date.now()) {
                passwordResetTokens.delete(tokenHash);
                return res.status(401).json({ erro: 'Token expirado ou invalido.' });
            }

            const senhaHash = await bcrypt.hash(String(senha), 10);
            const usuario = await UserModel.atualizarSenha(dados.usuarioId, senhaHash);
            passwordResetTokens.delete(tokenHash);

            if (!usuario) {
                return res.status(404).json({ erro: 'Usuario nao encontrado.' });
            }

            return res.status(200).json({ mensagem: 'Senha alterada com sucesso.' });
        } catch (erro) {
            console.error('Erro ao confirmar reset de senha:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },
};

module.exports = UserController;
