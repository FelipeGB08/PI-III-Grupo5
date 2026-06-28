const nodemailer = require('nodemailer');

function smtpConfigurado() {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function criarTransporter() {
    if (!smtpConfigurado()) return null;

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
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

async function enviarEmail({ to, subject, html, text }) {
    const transporter = criarTransporter();
    if (!transporter) return false;

    await transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to,
        subject,
        html,
        text,
    });
    return true;
}

async function enviarMagicLink(email, token) {
    const link = montarLink('/', token);
    const url = new URL(link);
    url.searchParams.set('mode', 'magic-link');
    return enviarEmail({
        to: email,
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
    enviarMagicLink,
    enviarResetSenha,
};
