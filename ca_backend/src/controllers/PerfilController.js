const PerfilModel = require('../models/PerfilModel');

const PerfilController = {
    // FUNÇÃO 1: CRIAR PERFIL
    criar: async (req, res) => {
        try {
            if (req.usuarioLogado.tipo_usuario !== 'profissional') {
                return res.status(403).json({ erro: 'Acesso negado: Apenas profissionais podem criar um Currículo Vivo.' });
            }

            const usuario_id = req.usuarioLogado.id;
            const { bio, telefone_comercial, cidade, categoria } = req.body;

            if (!bio || !telefone_comercial || !cidade || !categoria) {
                return res.status(400).json({ erro: 'Todos os campos do perfil são obrigatórios!' });
            }

            const perfilExistente = await PerfilModel.buscarPorUsuarioId(usuario_id);
            if (perfilExistente) {
                return res.status(400).json({ erro: 'Este usuário já possui um perfil profissional cadastrado.' });
            }

            const novoPerfil = await PerfilModel.criarPerfil(usuario_id, bio, telefone_comercial, cidade, categoria);

            return res.status(201).json({
                mensagem: 'Currículo Vivo criado com sucesso!',
                perfil: novoPerfil
            });

        } catch (erro) {
            console.error('Erro ao criar perfil:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    // FUNÇÃO 2: BUSCAR MEU PRÓPRIO PERFIL
    buscarMeuPerfil: async (req, res) => {
        try {
            // Trava de segurança extra para evitar consumo desnecessário do banco
            if (req.usuarioLogado.tipo_usuario !== 'profissional') {
                return res.status(403).json({ erro: 'Acesso negado: Apenas profissionais possuem Currículo Vivo.' });
            }

            const usuario_id = req.usuarioLogado.id;
            const perfil = await PerfilModel.buscarPorUsuarioId(usuario_id);

            if (!perfil) {
                return res.status(404).json({ erro: 'Perfil não encontrado.' });
            }

            return res.status(200).json(perfil);
        } catch (erro) {
            console.error('Erro ao buscar perfil:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    // FUNÇÃO 3: LISTAR TODOS OS PROFISSIONAIS (BUSCA)
    // Obs: Como criamos o ProfissionalController com GPS (Haversine), 
    // esta função aqui pode servir como um backup de busca simples!
    listarProfissionais: async (req, res) => {
        try {
            const { categoria, cidade } = req.query; 
            const profissionais = await PerfilModel.listarTodos({ categoria, cidade });
            return res.status(200).json(profissionais);
        } catch (erro) {
            console.error('Erro ao buscar profissionais:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    }
};

module.exports = PerfilController;