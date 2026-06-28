const PerfilModel = require('../models/PerfilModel');
const CategoriaModel = require('../models/CategoriaModel');
const { cidadePermitida } = require('../config/amaucCidades');

function isProfissional(usuarioLogado) {
    const perfil = usuarioLogado.perfil_tipo || usuarioLogado.tipo_usuario;
    return perfil === 'profissional';
}

function normalizarBoolean(valor) {
    if (valor === undefined || valor === null) return undefined;
    if (typeof valor === 'boolean') return valor;
    return ['true', '1', 'sim', 's'].includes(String(valor).toLowerCase());
}

function normalizarCidades(cidades) {
    const lista = Array.isArray(cidades)
        ? cidades
        : String(cidades || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);

    const validadas = [];
    for (const cidade of lista) {
        const validada = cidadePermitida(cidade);
        if (validada && !validadas.includes(validada)) {
            validadas.push(validada);
        }
    }
    return validadas;
}

function montarDadosRegionais(body) {
    const taxa = body.taxa_deslocamento !== undefined && body.taxa_deslocamento !== ''
        ? Number(body.taxa_deslocamento)
        : undefined;

    return {
        atende_rural: normalizarBoolean(body.atende_rural),
        atende_emergencia: normalizarBoolean(body.atende_emergencia),
        possui_veiculo: normalizarBoolean(body.possui_veiculo),
        cidades_atendidas: body.cidades_atendidas !== undefined
            ? normalizarCidades(body.cidades_atendidas)
            : undefined,
        taxa_deslocamento: Number.isFinite(taxa) ? taxa : undefined,
    };
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
            const regional = montarDadosRegionais(req.body);

            if (!biografia) {
                return res.status(400).json({ erro: 'biografia e obrigatoria.' });
            }

            if (cidade && !cidadePermitida(cidade)) {
                return res.status(403).json({ erro: 'Cidade informada nao pertence a regiao AMAUC.' });
            }

            const perfilExistente = await PerfilModel.buscarPorUsuarioId(usuarioId);
            if (perfilExistente) {
                return res.status(400).json({ erro: 'Este usuario ja possui um perfil profissional cadastrado.' });
            }

            const novoPerfil = await PerfilModel.criarPerfil(
                usuarioId,
                biografia,
                anosExperiencia,
                curriculoTexto,
                portfolioUrl,
                regional
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
                return res.status(404).json({ erro: 'Perfil nao encontrado.' });
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
                return res.status(404).json({ erro: 'Perfil nao encontrado.' });
            }

            const anosExperiencia = req.body.anos_experiencia !== undefined
                ? Number(req.body.anos_experiencia)
                : undefined;

            if (anosExperiencia !== undefined && (Number.isNaN(anosExperiencia) || anosExperiencia < 0)) {
                return res.status(400).json({ erro: 'anos_experiencia deve ser um numero maior ou igual a zero.' });
            }

            const regional = montarDadosRegionais(req.body);
            const perfilAtualizado = await PerfilModel.atualizarPerfil(usuarioId, {
                biografia: req.body.biografia ?? req.body.bio,
                anos_experiencia: anosExperiencia,
                curriculo_texto: req.body.curriculo_texto ?? req.body.curriculo,
                portfolio_url: req.body.portfolio_url ?? req.body.portfolio,
                ...regional,
            });

            return res.status(200).json({
                mensagem: 'Curriculo Vivo atualizado com sucesso!',
                perfil: perfilAtualizado,
            });
        } catch (erro) {
            console.error('Erro ao atualizar perfil profissional:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    listarProfissionais: async (req, res) => {
        try {
            const { categoria, cidade, atende_rural } = req.query;
            const profissionais = await PerfilModel.listarTodos({
                categoria,
                cidade,
                atende_rural,
            });
            return res.status(200).json(profissionais);
        } catch (erro) {
            console.error('Erro ao buscar profissionais:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },
};

module.exports = PerfilController;
