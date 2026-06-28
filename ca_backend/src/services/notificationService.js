const NotificationModel = require('../models/NotificationModel');

function normalizarPayload(payload) {
    return Object.fromEntries(
        Object.entries(payload || {}).map(([chave, valor]) => [
            chave,
            valor === undefined || valor === null ? '' : String(valor),
        ])
    );
}

async function enviarFcmLegacy({ tokens, titulo, corpo, payload }) {
    const serverKey = process.env.FCM_SERVER_KEY;
    if (!serverKey || tokens.length === 0) return false;

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
            Authorization: `key=${serverKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            registration_ids: tokens,
            priority: 'high',
            notification: {
                title: titulo,
                body: corpo,
            },
            data: normalizarPayload(payload),
        }),
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return true;
}

async function notificarUsuario({ usuarioId, tipo, titulo, corpo, payload }) {
    if (!usuarioId) return null;

    const notificacao = await NotificationModel.criarNotificacao({
        usuarioId,
        tipo,
        titulo,
        corpo,
        payload,
    });

    try {
        const tokens = await NotificationModel.buscarTokensAtivos(usuarioId);
        const enviada = await enviarFcmLegacy({
            tokens,
            titulo,
            corpo,
            payload: {
                ...payload,
                tipo,
                notificacao_id: notificacao.id,
            },
        });

        if (enviada) {
            await NotificationModel.marcarEnviada(notificacao.id);
        }
    } catch (erro) {
        console.error('Erro ao enviar FCM:', erro.message);
        await NotificationModel.marcarFalha(notificacao.id, erro.message);
    }

    return notificacao;
}

function notificarUsuarioSemBloquear(dados) {
    notificarUsuario(dados).catch((erro) => {
        console.error('Erro ao registrar notificacao:', erro.message);
    });
}

module.exports = {
    notificarUsuario,
    notificarUsuarioSemBloquear,
};
