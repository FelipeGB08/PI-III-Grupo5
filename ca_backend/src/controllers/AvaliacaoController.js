const AvaliacaoModel = require('../models/AvaliacaoModel');
const pool = require('../config/db'); // Importado para fazer as validações de segurança direto no banco

const AvaliacaoController = {
    criarAvaliacao: async (req, res) => {
        try {
            const cidadao_id = req.usuarioLogado.id;
            const { solicitacao_id, profissional_id, nota, comentario } = req.body;

            if (!solicitacao_id || !profissional_id || !nota) {
                return res.status(400).json({ erro: 'Solicitação, profissional e nota são obrigatórios.' });
            }

            // A nota tem que ser entre 1 e 5 estrelas
            if (nota < 1 || nota > 5) {
                return res.status(400).json({ erro: 'A nota deve ser entre 1 e 5.' });
            }

            // ==========================================
            // BLOCO DE SEGURANÇA: ANTI-FRAUDE (RF08 / RF09)
            // ==========================================
            const buscaServico = await pool.query(
                'SELECT cidadao_id, profissional_id, status FROM solicitacoes_orcamento WHERE id = $1',
                [solicitacao_id]
            );

            // Verifica se o serviço realmente existe
            if (buscaServico.rows.length === 0) {
                return res.status(404).json({ erro: 'Serviço não encontrado no sistema.' });
            }

            const solicitacao = buscaServico.rows[0];

            // 1. O cidadão logado é o verdadeiro contratante deste serviço?
            if (solicitacao.cidadao_id !== cidadao_id) {
                return res.status(403).json({ erro: 'Fraude detectada: Você só pode avaliar serviços que você mesmo solicitou.' });
            }

            // 2. O profissional que está recebendo a nota é o dono do orçamento?
            if (solicitacao.profissional_id !== profissional_id) {
                return res.status(403).json({ erro: 'Fraude detectada: Este serviço não foi realizado por este profissional.' });
            }

            // 3. O serviço já foi encerrado pelo profissional?
            if (solicitacao.status !== 'concluido') {
                return res.status(403).json({ erro: 'Operação bloqueada: O serviço precisa estar com status "concluido" para receber uma nota.' });
            }
            // ==========================================

            const novaAvaliacao = await AvaliacaoModel.criar(solicitacao_id, cidadao_id, profissional_id, nota, comentario);
            return res.status(201).json({ mensagem: 'Avaliação registrada!', avaliacao: novaAvaliacao });
            
        } catch (erro) {
            console.error('Erro ao criar avaliação:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    listarDoProfissional: async (req, res) => {
        try {
            const { id } = req.params; // Pega o ID da URL
            const avaliacoes = await AvaliacaoModel.buscarPorProfissional(id);
            const mediaResult = await AvaliacaoModel.calcularMedia(id);
            
            // Se não tiver média (ninguém avaliou), fica 0
            const media = mediaResult ? parseFloat(mediaResult) : 0; 
            
            return res.status(200).json({ media: media, avaliacoes: avaliacoes });
        } catch (erro) {
            console.error('Erro ao buscar avaliações:', erro);
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    }
};

module.exports = AvaliacaoController;