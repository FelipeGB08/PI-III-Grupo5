const NotificationModel = require('../models/NotificationModel');

const DispositivoController = {
    salvarToken: async (req, res) => {
        try {
            const usuarioId = req.usuarioLogado.id;
            const token = String(req.body.token || '').trim();
            const plataforma = String(req.body.plataforma || req.body.platform || '').trim();

            if (!token) {
                return res.status(400).json({ erro: 'Token do dispositivo e obrigatorio.' });
            }

            const deviceToken = await NotificationModel.salvarDeviceToken({
                usuarioId,
                token,
                plataforma,
            });

            return res.status(200).json({
                mensagem: 'Token do dispositivo registrado.',
                device_token: deviceToken,
            });
        } catch (erro) {
            console.error('Erro ao salvar token do dispositivo:', erro);
            return res.status(500).json({ erro: 'Erro interno ao salvar token.' });
        }
    },

    removerToken: async (req, res) => {
        try {
            const usuarioId = req.usuarioLogado.id;
            const token = String(req.body.token || '').trim();

            if (!token) {
                return res.status(400).json({ erro: 'Token do dispositivo e obrigatorio.' });
            }

            await NotificationModel.desativarDeviceToken({ usuarioId, token });
            return res.status(200).json({ mensagem: 'Token do dispositivo removido.' });
        } catch (erro) {
            console.error('Erro ao remover token do dispositivo:', erro);
            return res.status(500).json({ erro: 'Erro interno ao remover token.' });
        }
    },
};

module.exports = DispositivoController;
