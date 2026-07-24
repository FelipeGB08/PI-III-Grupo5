const FavoritoModel = require('../models/FavoritoModel');
const { montarProfissionalPublico } = require('../utils/profissionalPublico');

const FavoritoController = {
    listar: async (req, res) => {
        try {
            const usuarioId = req.usuarioLogado.id;
            const query = req.validated?.query || req.query || {};
            const lat = query.lat ?? null;
            const lng = query.lng ?? null;
            const { page, pageSize } = query;

            const resultado = await FavoritoModel.listar({
                usuarioId,
                lat,
                lng,
                page,
                pageSize,
            });
            const { items, ...paginacao } = resultado;
            const favoritos = items.map(montarProfissionalPublico);
            const ids = favoritos.map((item) => item.id);

            return res.status(200).json({
                favoritos,
                ids,
                ...paginacao,
                paginacao,
            });
        } catch (erro) {
            console.error('Erro ao listar favoritos:', erro);
            return res.status(500).json({ erro: 'Erro interno ao listar favoritos.' });
        }
    },

    ids: async (req, res) => {
        try {
            const usuarioId = req.usuarioLogado.id;
            const ids = await FavoritoModel.ids(usuarioId);
            return res.status(200).json({ ids, total: ids.length });
        } catch (erro) {
            console.error('Erro ao listar ids favoritos:', erro);
            return res.status(500).json({ erro: 'Erro interno ao listar favoritos.' });
        }
    },

    adicionar: async (req, res) => {
        try {
            const usuarioId = req.usuarioLogado.id;
            const profissionalId = Number(req.params.profissionalId || req.body.profissional_id);

            if (!profissionalId) {
                return res.status(400).json({ erro: 'ID do profissional invalido.' });
            }

            if (profissionalId === usuarioId) {
                return res.status(400).json({ erro: 'Nao e possivel favoritar seu proprio perfil.' });
            }

            const favorito = await FavoritoModel.adicionar({ usuarioId, profissionalId });
            if (!favorito) {
                return res.status(404).json({ erro: 'Profissional nao encontrado.' });
            }

            return res.status(201).json({
                mensagem: 'Profissional adicionado aos favoritos.',
                favorito,
            });
        } catch (erro) {
            console.error('Erro ao adicionar favorito:', erro);
            return res.status(500).json({ erro: 'Erro interno ao adicionar favorito.' });
        }
    },

    remover: async (req, res) => {
        try {
            const usuarioId = req.usuarioLogado.id;
            const profissionalId = Number(req.params.profissionalId);

            if (!profissionalId) {
                return res.status(400).json({ erro: 'ID do profissional invalido.' });
            }

            await FavoritoModel.remover({ usuarioId, profissionalId });
            return res.status(200).json({
                mensagem: 'Profissional removido dos favoritos.',
            });
        } catch (erro) {
            console.error('Erro ao remover favorito:', erro);
            return res.status(500).json({ erro: 'Erro interno ao remover favorito.' });
        }
    },
};

module.exports = FavoritoController;
