const UserModel = require('../models/UserModel');
const { montarRespostaUsuario } = require('../services/authResponseService');

const UserController = {
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
            const {
                nome,
                telefone,
                foto_url,
                endereco_principal,
                endereco,
                latitude,
                longitude,
            } = req.body;
            const nomeTrim = typeof nome === 'string' ? nome.trim() : undefined;
            const latitudeInformada = latitude !== undefined && latitude !== ''
                ? Number(latitude)
                : undefined;
            const longitudeInformada = longitude !== undefined && longitude !== ''
                ? Number(longitude)
                : undefined;
            if (nomeTrim !== undefined && nomeTrim.length < 2) {
                return res.status(400).json({ erro: 'Nome deve ter ao menos 2 caracteres.' });
            }

            if (
                (latitudeInformada !== undefined && !Number.isFinite(latitudeInformada)) ||
                (longitudeInformada !== undefined && !Number.isFinite(longitudeInformada))
            ) {
                return res.status(400).json({ erro: 'Latitude ou longitude invalida.' });
            }

            const usuarioAtualizado = await UserModel.atualizarPerfil(req.usuarioLogado.id, {
                nome: nomeTrim,
                telefone: telefone !== undefined ? telefone : undefined,
                foto_url: foto_url !== undefined ? foto_url : undefined,
                endereco_principal: endereco_principal !== undefined
                    ? endereco_principal
                    : endereco,
                latitude: latitudeInformada,
                longitude: longitudeInformada,
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
};

module.exports = UserController;
