const nodemailer = require('nodemailer');

const VARIAVEIS_SMTP_OBRIGATORIAS = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];

function valorSmtpConfigurado(nome) {
    const valor = String(process.env[nome] || '').trim();
    if (!valor) return false;
    return !/^(seu_|sua_)/i.test(valor);
}

function variaveisSmtpAusentes() {
    return VARIAVEIS_SMTP_OBRIGATORIAS.filter((nome) => !valorSmtpConfigurado(nome));
}

function smtpConfigurado() {
    return variaveisSmtpAusentes().length === 0;
}

function criarTransporter() {
    if (!smtpConfigurado()) return null;

    const port = Number(process.env.SMTP_PORT || 587);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        const erro = new Error('SMTP_PORT deve ser um numero entre 1 e 65535.');
        erro.code = 'ESMTPCONFIG';
        throw erro;
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

function mascararEmail(email) {
    const [usuario, dominio] = String(email || '').split('@');
    if (!usuario || !dominio) return 'destino-invalido';
    return `${usuario.slice(0, 2)}***@${dominio}`;
}

function classificarErroSmtp(erro) {
    const codigo = String(erro?.code || '').toUpperCase();
    const resposta = Number(erro?.responseCode || 0);

    if (codigo === 'EAUTH' || resposta === 534 || resposta === 535) {
        return {
            categoria: 'CREDENCIAIS_INVALIDAS',
            descricao: 'O servidor SMTP rejeitou o usuario ou a senha',
        };
    }

    if (codigo === 'ESMTPCONFIG') {
        return {
            categoria: 'CONFIGURACAO_INVALIDA',
            descricao: 'A configuracao SMTP local e invalida',
        };
    }

    if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS', 'ECONNREFUSED', 'ENOTFOUND'].includes(codigo)) {
        return {
            categoria: 'CONEXAO',
            descricao: 'Nao foi possivel conectar ao servidor SMTP',
        };
    }

    if (codigo === 'EENVELOPE') {
        return {
            categoria: 'REMETENTE_OU_DESTINATARIO',
            descricao: 'O servidor SMTP rejeitou o remetente ou destinatario',
        };
    }

    return {
        categoria: 'ENVIO_FALHOU',
        descricao: 'O servidor SMTP nao aceitou o envio',
    };
}

function registrarFallbackSmtp(ausentes) {
    const lista = ausentes.join(', ');
    if (process.env.NODE_ENV !== 'production') {
        console.warn(
            `[EMAIL][FALLBACK_LOCAL] SMTP nao configurado (faltando: ${lista}). ` +
            'Nenhum email foi enviado; o token local sera fornecido pelo fluxo de desenvolvimento.'
        );
        return;
    }

    console.error(
        `[EMAIL][CONFIGURACAO_AUSENTE] SMTP nao configurado em producao (faltando: ${lista}). ` +
        'O fallback local esta desabilitado.'
    );
}

function registrarErroSmtp(erro, { operacao, to }) {
    const classificacao = classificarErroSmtp(erro);
    const detalhes = [
        erro?.code ? `code=${erro.code}` : null,
        erro?.responseCode ? `responseCode=${erro.responseCode}` : null,
        erro?.command ? `command=${erro.command}` : null,
        erro?.message ? `mensagem=${erro.message}` : null,
    ].filter(Boolean).join(' ');

    console.error(
        `[EMAIL][SMTP][${classificacao.categoria}] ${classificacao.descricao}. ` +
        `operacao=${operacao} destino=${mascararEmail(to)}${detalhes ? ` ${detalhes}` : ''}`
    );

    if (erro && typeof erro === 'object') {
        erro.emailCategoria = classificacao.categoria;
    }
}

function baseUrlFrontend() {
    return (process.env.FRONTEND_URL || 'http://localhost:56000').replace(/\/$/, '');
}

function montarLink(path, token) {
    const url = new URL(path, baseUrlFrontend());
    url.searchParams.set('token', token);
    return url.toString();
}

function htmlTemplate({ titulo, texto, cta, link }) {
    return `
        <div style="font-family:Arial,sans-serif;background:#07111F;padding:24px;color:#F4F8FF">
            <div style="max-width:560px;margin:0 auto;background:#13243A;border:1px solid #27415F;border-radius:16px;padding:24px">
                <h1 style="margin:0 0 12px;color:#22D3EE">${titulo}</h1>
                <p style="line-height:1.5;color:#B7C6DA">${texto}</p>
                <p style="margin:24px 0">
                    <a href="${link}" style="background:#22D3EE;color:#07111F;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;display:inline-block">${cta}</a>
                </p>
                <p style="font-size:12px;color:#8AA0B8">Se o botao nao abrir, copie este link:</p>
                <p style="word-break:break-all;font-size:12px;color:#8AA0B8">${link}</p>
            </div>
        </div>
    `;
}

async function verificarSmtp() {
    const ausentes = variaveisSmtpAusentes();
    if (ausentes.length > 0) {
        registrarFallbackSmtp(ausentes);
        return false;
    }

    try {
        const transporter = criarTransporter();
        await transporter.verify();
        console.info(
            `[EMAIL][SMTP_PRONTO] Conexao autenticada em ${process.env.SMTP_HOST}:` +
            `${Number(process.env.SMTP_PORT || 587)} como ${mascararEmail(process.env.SMTP_USER)}.`
        );
        return true;
    } catch (erro) {
        registrarErroSmtp(erro, {
            operacao: 'verificacao',
            to: process.env.SMTP_USER,
        });
        throw erro;
    }
}

async function enviarEmail({ to, subject, html, text, operacao }) {
    const ausentes = variaveisSmtpAusentes();
    if (ausentes.length > 0) {
        registrarFallbackSmtp(ausentes);
        return false;
    }

    try {
        const transporter = criarTransporter();
        const info = await transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to,
            subject,
            html,
            text,
        });
        console.info(
            `[EMAIL][SMTP_ENVIADO] operacao=${operacao} destino=${mascararEmail(to)} ` +
            `messageId=${info.messageId || 'nao-informado'}`
        );
        return true;
    } catch (erro) {
        registrarErroSmtp(erro, { operacao, to });
        throw erro;
    }
}

async function enviarMagicLink(email, token) {
    const link = montarLink('/', token);
    const url = new URL(link);
    url.searchParams.set('mode', 'magic-link');
    return enviarEmail({
        to: email,
        operacao: 'magic-link',
        subject: 'Seu link de acesso - Conecta AMAUC',
        text: `Acesse sua conta pelo link: ${url.toString()}`,
        html: htmlTemplate({
            titulo: 'Acesso ao Conecta AMAUC',
            texto: 'Recebemos uma solicitacao de login sem senha. O link expira em 15 minutos.',
            cta: 'Entrar agora',
            link: url.toString(),
        }),
    });
}

async function enviarResetSenha(email, token) {
    const link = montarLink('/', token);
    const url = new URL(link);
    url.searchParams.set('mode', 'reset-password');
    return enviarEmail({
        to: email,
        operacao: 'reset-senha',
        subject: 'Redefinicao de senha - Conecta AMAUC',
        text: `Redefina sua senha pelo link: ${url.toString()}`,
        html: htmlTemplate({
            titulo: 'Redefinir senha',
            texto: 'Recebemos uma solicitacao para redefinir sua senha. O link expira em 30 minutos.',
            cta: 'Redefinir senha',
            link: url.toString(),
        }),
    });
}

module.exports = {
    smtpConfigurado,
    verificarSmtp,
    enviarMagicLink,
    enviarResetSenha,
};
