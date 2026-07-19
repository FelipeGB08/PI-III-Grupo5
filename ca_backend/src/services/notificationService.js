const { getFirebaseMessaging } = require('../config/firebaseAdmin');
const NotificationModel = require('../models/NotificationModel');
const logger = require('../utils/logger');

const TOKEN_INVALIDO_CODES = new Set([
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered',
    'messaging/invalid-argument',
]);

function normalizarPayload(payload) {
    return Object.fromEntries(
        Object.entries(payload || {}).map(([chave, valor]) => [
            chave,
            valor === undefined || valor === null ? '' : String(valor),
        ])
    );
}

async function enviarFirebase({ tokens, titulo, corpo, payload }) {
    if (!tokens.length) {
        return { enviado: false, sucesso: 0, falha: 0 };
    }

    const messaging = getFirebaseMessaging();
    const response = await messaging.sendEachForMulticast({
        tokens,
        notification: {
            title: titulo,
            body: corpo,
        },
        data: normalizarPayload(payload),
        android: {
            priority: 'high',
            notification: {
                channelId: 'chamados_amauc',
                sound: 'default',
            },
        },
        apns: {
            payload: {
                aps: {
                    sound: 'default',
                },
            },
        },
    });

    await Promise.all(
        response.responses.map(async (resultado, index) => {
            const code = resultado.error?.code;
            if (code && TOKEN_INVALIDO_CODES.has(code)) {
                await NotificationModel.desativarTokenGlobal(tokens[index]);
            }
        })
    );

    return {
        enviado: response.successCount > 0,
        sucesso: response.successCount,
        falha: response.failureCount,
    };
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
        const resultado = await enviarFirebase({
            tokens,
            titulo,
            corpo,
            payload: {
                ...payload,
                tipo,
                notificacao_id: notificacao.id,
            },
        });

        if (resultado.enviado) {
            await NotificationModel.marcarEnviada(notificacao.id);
        } else if (tokens.length > 0) {
            await NotificationModel.marcarFalha(
                notificacao.id,
                `Firebase nao entregou a notificacao. Falhas: ${resultado.falha}`
            );
        }
    } catch (erro) {
        logger.error('Falha ao enviar notificacao Firebase Cloud Messaging.', {
            erro,
            componente: 'push',
            usuarioId,
            tipo,
            notificacaoId: notificacao.id,
        });
        await NotificationModel.marcarFalha(notificacao.id, erro.message);
    }

    return notificacao;
}

function notificarUsuarioSemBloquear(dados) {
    notificarUsuario(dados).catch((erro) => {
        logger.error('Falha ao registrar notificacao.', {
            erro,
            componente: 'push',
            usuarioId: dados?.usuarioId,
            tipo: dados?.tipo,
        });
    });
}

module.exports = {
    notificarUsuario,
    notificarUsuarioSemBloquear,
};
