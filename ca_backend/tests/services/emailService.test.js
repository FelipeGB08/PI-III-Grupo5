jest.mock('nodemailer', () => ({
    createTransport: jest.fn(),
}));

const nodemailer = require('nodemailer');
const {
    enviarMagicLink,
    enviarResetSenha,
    smtpConfigurado,
    verificarSmtp,
} = require('../../src/services/emailService');

const NOMES_ENV = [
    'NODE_ENV',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_SECURE',
    'SMTP_USER',
    'SMTP_PASS',
    'MAIL_FROM',
    'FRONTEND_URL',
];
const envOriginal = Object.fromEntries(NOMES_ENV.map((nome) => [nome, process.env[nome]]));

function configurarSmtp() {
    process.env.NODE_ENV = 'test';
    process.env.SMTP_HOST = 'smtp.exemplo.test';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'mailer@exemplo.test';
    process.env.SMTP_PASS = 'senha-de-teste';
    process.env.MAIL_FROM = 'Conecta AMAUC <mailer@exemplo.test>';
    process.env.FRONTEND_URL = 'https://app.exemplo.test';
}

function removerSmtp() {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
}

afterEach(() => {
    for (const [nome, valor] of Object.entries(envOriginal)) {
        if (valor === undefined) delete process.env[nome];
        else process.env[nome] = valor;
    }
    jest.restoreAllMocks();
});

test('mantem fallback local explicito quando SMTP nao esta configurado', async () => {
    process.env.NODE_ENV = 'development';
    process.env.SMTP_HOST = 'smtp.gmail.com';
    process.env.SMTP_USER = 'seu_email@gmail.com';
    process.env.SMTP_PASS = 'sua_senha_de_app';
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(enviarMagicLink('teste@exemplo.com', 'token-local')).resolves.toBe(false);

    expect(smtpConfigurado()).toBe(false);
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
    expect(JSON.parse(aviso.mock.calls[0][0])).toEqual(expect.objectContaining({
        nivel: 'warn',
        componente: 'email',
        modo: 'fallback_local',
    }));
});

test('registra configuracao ausente sem anunciar fallback em producao', async () => {
    process.env.NODE_ENV = 'production';
    removerSmtp();
    const erroLog = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(enviarResetSenha('teste@exemplo.com', 'token-local')).resolves.toBe(false);

    expect(JSON.parse(erroLog.mock.calls[0][0])).toEqual(expect.objectContaining({
        nivel: 'error',
        componente: 'email',
        modo: 'configuracao_ausente',
    }));
});

test('envia magic link quando o SMTP aceita a mensagem', async () => {
    configurarSmtp();
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'smtp-123' });
    nodemailer.createTransport.mockReturnValue({ sendMail });
    jest.spyOn(console, 'info').mockImplementation(() => {});

    await expect(enviarMagicLink('destino@exemplo.com', 'token-real')).resolves.toBe(true);

    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
        from: 'Conecta AMAUC <mailer@exemplo.test>',
        to: 'destino@exemplo.com',
        subject: 'Seu link de acesso - Conecta AMAUC',
        text: expect.stringContaining('mode=magic-link'),
    }));
});

test('classifica claramente credenciais SMTP rejeitadas', async () => {
    configurarSmtp();
    const erroAuth = Object.assign(new Error('Invalid login'), {
        code: 'EAUTH',
        responseCode: 535,
        command: 'AUTH PLAIN',
    });
    nodemailer.createTransport.mockReturnValue({
        sendMail: jest.fn().mockRejectedValue(erroAuth),
    });
    const erroLog = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(enviarResetSenha('destino@exemplo.com', 'token-real')).rejects.toBe(erroAuth);

    expect(erroAuth.emailCategoria).toBe('CREDENCIAIS_INVALIDAS');
    expect(JSON.parse(erroLog.mock.calls[0][0])).toEqual(expect.objectContaining({
        nivel: 'error',
        componente: 'email',
        categoria: 'CREDENCIAIS_INVALIDAS',
        codigo: 'EAUTH',
    }));
});

test('verifica a conexao SMTP antes do teste manual', async () => {
    configurarSmtp();
    const verify = jest.fn().mockResolvedValue(true);
    nodemailer.createTransport.mockReturnValue({ verify });
    jest.spyOn(console, 'info').mockImplementation(() => {});

    await expect(verificarSmtp()).resolves.toBe(true);
    expect(verify).toHaveBeenCalledTimes(1);
});
