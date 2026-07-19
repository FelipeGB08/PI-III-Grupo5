require('dotenv').config();

const { smtpConfigurado, verificarSmtp } = require('../src/services/emailService');

const API_BASE_URL = (process.env.API_BASE_URL || 'http://localhost:3000/api').replace(/\/$/, '');
const emailDestino = String(process.argv[2] || process.env.EMAIL_TEST_TO || '').trim().toLowerCase();

function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function solicitarEnvio(path, nomeFluxo) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailDestino }),
    });

    const texto = await response.text();
    let payload;
    try {
        payload = texto ? JSON.parse(texto) : {};
    } catch {
        throw new Error(`${nomeFluxo}: a API retornou uma resposta que nao e JSON (${response.status}).`);
    }

    if (response.status !== 202) {
        throw new Error(`${nomeFluxo}: esperado HTTP 202, recebido ${response.status}: ${texto}`);
    }

    if (payload.email_enviado !== true) {
        if (payload.dev_token) {
            throw new Error(`${nomeFluxo}: a API entrou em fallback local e nao enviou email.`);
        }
        throw new Error(
            `${nomeFluxo}: a API nao confirmou o envio. ` +
            'Confirme que o destinatario esta cadastrado e que o backend foi reiniciado com SMTP configurado.'
        );
    }

    console.log(`[EMAIL TEST] ${nomeFluxo}: servidor SMTP aceitou o envio.`);
}

async function executar() {
    if (!validarEmail(emailDestino)) {
        throw new Error(
            'Informe um email de teste cadastrado: npm run test:email -- destinatario@exemplo.com'
        );
    }

    if (!smtpConfigurado()) {
        throw new Error(
            'SMTP nao configurado. Preencha SMTP_HOST, SMTP_USER e SMTP_PASS no ca_backend/.env.'
        );
    }

    console.log(`[EMAIL TEST] API: ${API_BASE_URL}`);
    console.log(`[EMAIL TEST] Destinatario: ${emailDestino}`);
    await verificarSmtp();
    await solicitarEnvio('/auth/magic-link', 'magic link');
    await solicitarEnvio('/auth/password-reset/request', 'reset de senha');
    console.log('[EMAIL TEST] Dois envios aceitos. Confirme a caixa de entrada e a pasta de spam.');
}

executar().catch((erro) => {
    console.error(`[EMAIL TEST] Falha: ${erro.message}`);
    process.exit(1);
});
