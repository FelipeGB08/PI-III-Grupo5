const bcrypt = require('bcrypt');
const UserModel = require('../models/UserModel');
const logger = require('../utils/logger');
const { criarRespostaLogin } = require('../services/authResponseService');
const { enviarMagicLink, enviarResetSenha } = require('../services/emailService');
const {
    ambienteDesenvolvimento,
    expiraEmMinutos,
    gerarTokenSeguro,
    hashToken,
    limparExpirados,
    magicLinkTokens,
    passwordResetTokens,
} = require('../services/passwordTokenStore');

const PasswordResetController = {
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
                    logger.info('Magic link gerado no modo de desenvolvimento.', {
                        componente: 'autenticacao',
                        operacao: 'magic_link_dev',
                        email: emailNormalizado,
                        token,
                    });
                }

                if (enviado) {
                    resposta.email_enviado = true;
                }
            }

            return res.status(202).json(resposta);
        } catch (erro) {
            logger.error('Falha ao solicitar magic link.', {
                erro,
                componente: 'autenticacao',
                operacao: 'magic_link_solicitar',
            });
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

            if (!usuario || usuario.ativo === false) {
                return res.status(404).json({ erro: 'Usuario nao encontrado.' });
            }

            return res.status(200).json(
                await criarRespostaLogin(usuario, 'Login sem senha realizado com sucesso!')
            );
        } catch (erro) {
            logger.error('Falha ao verificar magic link.', {
                erro,
                componente: 'autenticacao',
                operacao: 'magic_link_verificar',
            });
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
                    logger.info('Token de reset gerado no modo de desenvolvimento.', {
                        componente: 'autenticacao',
                        operacao: 'reset_senha_dev',
                        email: emailNormalizado,
                        token,
                    });
                }

                if (enviado) {
                    resposta.email_enviado = true;
                }
            }

            return res.status(202).json(resposta);
        } catch (erro) {
            logger.error('Falha ao solicitar reset de senha.', {
                erro,
                componente: 'autenticacao',
                operacao: 'reset_senha_solicitar',
            });
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
            logger.error('Falha ao confirmar reset de senha.', {
                erro,
                componente: 'autenticacao',
                operacao: 'reset_senha_confirmar',
            });
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },
};

module.exports = PasswordResetController;
