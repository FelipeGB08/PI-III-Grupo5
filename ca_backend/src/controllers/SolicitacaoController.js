const SolicitacaoModel = require('../models/SolicitacaoModel');
const pool = require('../config/db'); // Importado para validações e atualizações dinâmicas

const SolicitacaoController = {
    criarSolicitacao: async (req, res) => {
        try {
            // O ID do cidadão vem seguro, direto do token da catraca
            const cidadao_id = req.usuarioLogado.id; 
            const { profissional_id, descricao } = req.body;

            if (!profissional_id || !descricao) {
                return res.status(400).json({ erro: 'Profissional e descrição são obrigatórios.' });
            }

            const novaSolicitacao = await SolicitacaoModel.criar(cidadao_id, profissional_id, descricao);
            
            return res.status(201).json({ 
                mensagem: 'Orçamento solicitado com sucesso!', 
                solicitacao: novaSolicitacao 
            });
        } catch (erro) {
            console.error('Erro ao criar solicitação:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    listarMeusPedidos: async (req, res) => {
        try {
            const profissional_id = req.usuarioLogado.id;
            const pedidos = await SolicitacaoModel.buscarPorProfissional(profissional_id);
            return res.status(200).json(pedidos);
        } catch (erro) {
            console.error('Erro ao buscar pedidos:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    atualizarStatus: async (req, res) => {
        try {
            const profissionalLogadoId = req.usuarioLogado.id;
            const { id } = req.params; // ID do pedido que vem na URL
            const { status, preco } = req.body; // Agora aceita o preço para o RF07

            // ==========================================
            // BLOCO DE SEGURANÇA E NEGOCIAÇÃO (RF07)
            // ==========================================
            const buscaServico = await pool.query(
                'SELECT profissional_id FROM solicitacoes_orcamento WHERE id = $1', 
                [id]
            );

            if (buscaServico.rows.length === 0) {
                return res.status(404).json({ erro: 'Orçamento não encontrado.' });
            }

            // Trava de Propriedade: Esse orçamento foi mandado para mim?
            if (buscaServico.rows[0].profissional_id !== profissionalLogadoId) {
                return res.status(403).json({ erro: 'Acesso negado: Este orçamento pertence a outro profissional.' });
            }

            // Se é o dono do orçamento, faz a atualização do status e/ou do preço
            // O COALESCE garante que se o Flutter não mandar o preço, ele mantém o que já estava no banco
            const queryUpdate = `
                UPDATE solicitacoes_orcamento 
                SET status = COALESCE($1, status), preco = COALESCE($2, preco) 
                WHERE id = $3 
                RETURNING *;
            `;
            const atualizado = await pool.query(queryUpdate, [status, preco, id]);
            // ==========================================

            return res.status(200).json({ 
                mensagem: 'Orçamento atualizado com sucesso!', 
                solicitacao: atualizado.rows[0] 
            });
        } catch (erro) {
            console.error('Erro ao atualizar status/preço:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    }
};

module.exports = SolicitacaoController;