const { getFirebaseMessaging } = require('../config/firebaseAdmin');
const NotificationModel = require('../models/NotificationModel');
const NotificationPreferenceModel = require('../models/NotificationPreferenceModel');
const FavoritoModel = require('../models/FavoritoModel');
const logger = require('../utils/logger');

const JANELA_NOTIFICACAO_DISPONIBILIDADE_HORAS = 6;

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

async function notificarFavoritosSobreNovosHorarios({
    profissionalId,
    profissionalNome,
    novosHorarios,
}) {
    const favoritos = await FavoritoModel.listarClientesParaNotificarDisponibilidade(
        profissionalId
    );

    if (!favoritos.length) {
        return { destinatarios: 0, notificacoesAgendadas: 0 };
    }

    const nome = String(profissionalNome || 'Um profissional favorito').trim();
    const quantidade = novosHorarios?.length || 1;
    const resultados = await Promise.allSettled(
        favoritos.map(async ({ cliente_id: clienteId }) => {
            const reserva = await NotificationPreferenceModel.reservarNotificacaoDisponibilidade({
                clienteId,
                profissionalId,
                janelaHoras: JANELA_NOTIFICACAO_DISPONIBILIDADE_HORAS,
            });

            if (!reserva) return false;

            await notificarUsuario({
                usuarioId: clienteId,
                tipo: 'favorito_novo_horario',
                titulo: 'Novo horario disponivel',
                corpo: `${nome} adicionou ${quantidade === 1 ? 'um novo horario' : `${quantidade} novos horarios`} na agenda.`,
                payload: {
                    profissional_id: profissionalId,
                    novos_horarios: quantidade,
                },
            });

            return true;
        })
    );

    let notificacoesAgendadas = 0;
    for (const resultado of resultados) {
        if (resultado.status === 'fulfilled' && resultado.value) {
            notificacoesAgendadas += 1;
            continue;
        }

        if (resultado.status === 'rejected') {
            logger.error('Falha ao notificar favorito sobre novos horarios.', {
                erro: resultado.reason,
                componente: 'push',
                profissionalId,
            });
        }
    }

    return { destinatarios: favoritos.length, notificacoesAgendadas };
}

function notificarFavoritosSobreNovosHorariosSemBloquear(dados) {
    notificarFavoritosSobreNovosHorarios(dados).catch((erro) => {
        logger.error('Falha ao processar notificacoes de disponibilidade para favoritos.', {
            erro,
            componente: 'push',
            profissionalId: dados?.profissionalId,
        });
    });
}

module.exports = {
    notificarUsuario,
    notificarUsuarioSemBloquear,
    notificarFavoritosSobreNovosHorarios,
    notificarFavoritosSobreNovosHorariosSemBloquear,
    JANELA_NOTIFICACAO_DISPONIBILIDADE_HORAS,
};
