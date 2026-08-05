const pool = require('../config/db');
const {
    criarMetadadosPaginacao,
    normalizarPaginacao,
} = require('../utils/pagination');

const AvaliacaoModel = {
    criar: async (servicoId, notaEstrelas, comentario) => {
        const query = `
            INSERT INTO avaliacoes (servico_id, nota_estrelas, comentario)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const resultado = await pool.query(query, [servicoId, notaEstrelas, comentario || null]);
        return resultado.rows[0];
    },

    buscarPorServico: async (servicoId) => {
        const query = 'SELECT * FROM avaliacoes WHERE servico_id = $1';
        const resultado = await pool.query(query, [servicoId]);
        return resultado.rows[0];
    },

    buscarPorProfissional: async (
        profissionalId,
        { page = 1, pageSize = 20 } = {}
    ) => {
        const paginacao = normalizarPaginacao({ page, pageSize });
        const totalResult = await pool.query(
            `
            SELECT COUNT(*)::int AS total
            FROM avaliacoes a
            INNER JOIN servicos_solicitados s ON s.id = a.servico_id
            WHERE s.prof_id = $1;
            `,
            [profissionalId]
        );
        const query = `
            SELECT a.id, a.servico_id, a.nota_estrelas, a.comentario, a.criado_em
            FROM avaliacoes a
            INNER JOIN servicos_solicitados s ON s.id = a.servico_id
            WHERE s.prof_id = $1
            ORDER BY a.criado_em DESC
            LIMIT $2 OFFSET $3;
        `;
        const resultado = await pool.query(query, [
            profissionalId,
            paginacao.limit,
            paginacao.offset,
        ]);
        const metadados = criarMetadadosPaginacao({
            total: totalResult.rows[0]?.total,
            page: paginacao.page,
            pageSize: paginacao.pageSize,
        });

        return { items: resultado.rows, ...metadados };
    },

    calcularMedia: async (profissionalId) => {
        const query = `
            SELECT ROUND(AVG(a.nota_estrelas), 1) AS media
            FROM avaliacoes a
            INNER JOIN servicos_solicitados s ON s.id = a.servico_id
            WHERE s.prof_id = $1;
        `;
        const resultado = await pool.query(query, [profissionalId]);
        return resultado.rows[0].media;
    },

    criarParaCliente: async (servicoId, notaEstrelas, comentario) => {
        const resultado = await pool.query(
            `
            INSERT INTO avaliacoes_clientes (servico_id, nota_estrelas, comentario)
            VALUES ($1, $2, $3)
            RETURNING *;
            `,
            [servicoId, notaEstrelas, comentario || null]
        );
        return resultado.rows[0];
    },

    buscarAvaliacaoClientePorServico: async (servicoId) => {
        const resultado = await pool.query(
            'SELECT * FROM avaliacoes_clientes WHERE servico_id = $1',
            [servicoId]
        );
        return resultado.rows[0];
    },

    buscarDoClientePrivado: async (
        clienteId,
        { page = 1, pageSize = 20 } = {}
    ) => {
        const paginacao = normalizarPaginacao({ page, pageSize });
        const totalResult = await pool.query(
            `
            SELECT COUNT(*)::int AS total
            FROM avaliacoes_clientes ac
            INNER JOIN servicos_solicitados s ON s.id = ac.servico_id
            WHERE s.cidadao_id = $1;
            `,
            [clienteId]
        );
        const resultado = await pool.query(
            `
            SELECT ac.id, ac.servico_id, ac.nota_estrelas, ac.comentario, ac.criado_em,
                   s.prof_id, s.cidadao_id
            FROM avaliacoes_clientes ac
            INNER JOIN servicos_solicitados s ON s.id = ac.servico_id
            WHERE s.cidadao_id = $1
            ORDER BY ac.criado_em DESC
            LIMIT $2 OFFSET $3;
            `,
            [clienteId, paginacao.limit, paginacao.offset]
        );
        const metadados = criarMetadadosPaginacao({
            total: totalResult.rows[0]?.total,
            page: paginacao.page,
            pageSize: paginacao.pageSize,
        });
        return { items: resultado.rows, ...metadados };
    },
};

module.exports = AvaliacaoModel;
