const CategoriaModel = require('../models/CategoriaModel');

const CategoriaController = {
    listar: async (req, res) => {
        try {
            const categorias = await CategoriaModel.listarTodas();
            return res.status(200).json(categorias);
        } catch (erro) {
            console.error('Erro ao listar categorias:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    criar: async (req, res) => {
        try {
            // Trava de segurança: só "admin" passa!
            if (req.usuarioLogado.tipo_usuario !== 'admin') {
                return res.status(403).json({ erro: 'Acesso negado. Apenas administradores.' });
            }

            const { nome, descricao } = req.body;
            if (!nome) {
                return res.status(400).json({ erro: 'O nome da categoria é obrigatório.' });
            }

            const novaCategoria = await CategoriaModel.criar(nome, descricao);
            return res.status(201).json({ mensagem: 'Categoria criada!', categoria: novaCategoria });
        } catch (erro) {
            console.error('Erro ao criar categoria:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    deletar: async (req, res) => {
        try {
            // Trava de segurança: só "admin" passa!
            if (req.usuarioLogado.tipo_usuario !== 'admin') {
                return res.status(403).json({ erro: 'Acesso negado. Apenas administradores.' });
            }

            const { id } = req.params;
            const deletada = await CategoriaModel.deletar(id);
            
            if (!deletada) {
                return res.status(404).json({ erro: 'Categoria não encontrada.' });
            }

            return res.status(200).json({ mensagem: 'Categoria excluída com sucesso!' });
        } catch (erro) {
            console.error('Erro ao deletar categoria:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    }
};

module.exports = CategoriaController;