const PerfilModel = require('../models/PerfilModel');
const CategoriaModel = require('../models/CategoriaModel');
const { cidadePermitida } = require('../config/amaucCidades');

function isProfissional(usuarioLogado) {
    const perfil = usuarioLogado.perfil_tipo || usuarioLogado.tipo_usuario;
    return perfil === 'profissional';
}

const PerfilController = {
    criar: async (req, res) => {
        try {
            if (!isProfissional(req.usuarioLogado)) {
                return res.status(403).json({
                    erro: 'Acesso negado: apenas profissionais podem criar perfil.',
                });
            }

            const usuarioId = req.usuarioLogado.id;
            const biografia = req.body.biografia || req.body.bio;
            const anosExperiencia = Number(req.body.anos_experiencia || 0);
            const curriculoTexto = req.body.curriculo_texto || req.body.curriculo || null;
            const portfolioUrl = req.body.portfolio_url || req.body.portfolio || null;
            const categoriaNome = req.body.categoria || req.body.nome_servico;
            const cidade = req.body.cidade || req.body.cidade_amauc;

            if (!biografia) {
                return res.status(400).json({ erro: 'biografia é obrigatória.' });
            }

            if (cidade) {
                const cidadeValidada = cidadePermitida(cidade);
                if (!cidadeValidada) {
                    return res.status(403).json({ erro: 'Cidade informada não pertence à região AMAUC.' });
                }
            }

            const perfilExistente = await PerfilModel.buscarPorUsuarioId(usuarioId);
            if (perfilExistente) {
                return res.status(400).json({ erro: 'Este usuário já possui um perfil profissional cadastrado.' });
            }

            const novoPerfil = await PerfilModel.criarPerfil(
                usuarioId,
                biografia,
                anosExperiencia,
                curriculoTexto,
                portfolioUrl
            );

            if (categoriaNome) {
                const categoria = await CategoriaModel.buscarPorNome(categoriaNome);
                if (categoria) {
                    await PerfilModel.vincularCategoria(usuarioId, categoria.id);
                }
            }

            return res.status(201).json({
                mensagem: 'Perfil profissional criado com sucesso!',
                perfil: novoPerfil,
            });
        } catch (erro) {
            console.error('Erro ao criar perfil:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    buscarMeuPerfil: async (req, res) => {
        try {
            if (!isProfissional(req.usuarioLogado)) {
                return res.status(403).json({ erro: 'Acesso negado: apenas profissionais possuem perfil.' });
            }

            const usuarioId = req.usuarioLogado.id;
            const perfil = await PerfilModel.buscarPorUsuarioId(usuarioId);

            if (!perfil) {
                return res.status(404).json({ erro: 'Perfil não encontrado.' });
            }

            return res.status(200).json(perfil);
        } catch (erro) {
            console.error('Erro ao buscar perfil:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    atualizarMeuPerfil: async (req, res) => {
        try {
            if (!isProfissional(req.usuarioLogado)) {
                return res.status(403).json({ erro: 'Acesso negado: apenas profissionais possuem perfil.' });
            }

            const usuarioId = req.usuarioLogado.id;
            const perfilExistente = await PerfilModel.buscarPorUsuarioId(usuarioId);
            if (!perfilExistente) {
                return res.status(404).json({ erro: 'Perfil nÃ£o encontrado.' });
            }

            const anosExperiencia = req.body.anos_experiencia !== undefined
                ? Number(req.body.anos_experiencia)
                : undefined;

            if (anosExperiencia !== undefined && (Number.isNaN(anosExperiencia) || anosExperiencia < 0)) {
                return res.status(400).json({ erro: 'anos_experiencia deve ser um nÃºmero maior ou igual a zero.' });
            }

            const perfilAtualizado = await PerfilModel.atualizarPerfil(usuarioId, {
                biografia: req.body.biografia ?? req.body.bio,
                anos_experiencia: anosExperiencia,
                curriculo_texto: req.body.curriculo_texto ?? req.body.curriculo,
                portfolio_url: req.body.portfolio_url ?? req.body.portfolio,
            });

            return res.status(200).json({
                mensagem: 'CurrÃ­culo Vivo atualizado com sucesso!',
                perfil: perfilAtualizado,
            });
        } catch (erro) {
            console.error('Erro ao atualizar perfil profissional:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    listarProfissionais: async (req, res) => {
        try {
            const { categoria, cidade } = req.query;
            const profissionais = await PerfilModel.listarTodos({ categoria, cidade });
            return res.status(200).json(profissionais);
        } catch (erro) {
            console.error('Erro ao buscar profissionais:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },
};

module.exports = PerfilController;
