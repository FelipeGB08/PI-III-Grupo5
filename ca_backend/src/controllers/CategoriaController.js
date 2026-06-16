const CategoriaModel = require('../models/CategoriaModel');

function isAdmin(usuarioLogado) {
    const perfil = usuarioLogado.perfil_tipo || usuarioLogado.tipo_usuario;
    return perfil === 'admin';
}

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
            if (!isAdmin(req.usuarioLogado)) {
                return res.status(403).json({ erro: 'Acesso negado. Apenas administradores.' });
            }

            const nomeServico = req.body.nome_servico || req.body.nome;
            if (!nomeServico) {
                return res.status(400).json({ erro: 'nome_servico é obrigatório.' });
            }

            const novaCategoria = await CategoriaModel.criar(nomeServico);
            return res.status(201).json({ mensagem: 'Categoria criada!', categoria: novaCategoria });
        } catch (erro) {
            console.error('Erro ao criar categoria:', erro);
            if (erro.code === '23505') {
                return res.status(400).json({ erro: 'Já existe uma categoria com este nome.' });
            }
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    deletar: async (req, res) => {
        try {
            if (!isAdmin(req.usuarioLogado)) {
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
    },
};

module.exports = CategoriaController;
