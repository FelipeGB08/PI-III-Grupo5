const pool = require('../config/db');
const {
    criarMetadadosPaginacao,
    normalizarPaginacao,
} = require('../utils/pagination');

const ServicoModel = {
    criar: async (cidadaoId, profId, descricao, fotoUrl, dadosAgenda = {}) => {
        const query = `
            INSERT INTO servicos_solicitados (
                cidadao_id,
                prof_id,
                agenda_servico_id,
                servico_nome,
                descricao,
                endereco_atendimento,
                atendimento_latitude,
                atendimento_longitude,
                agendado_para,
                duracao_minutos,
                foto_url,
                status,
                preco
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                'pendente', $12
            )
            RETURNING *;
        `;
        const resultado = await pool.query(query, [
            cidadaoId,
            profId,
            dadosAgenda.agenda_servico_id || null,
            dadosAgenda.servico_nome || null,
            descricao,
            dadosAgenda.endereco_atendimento || null,
            dadosAgenda.atendimento_latitude ?? null,
            dadosAgenda.atendimento_longitude ?? null,
            dadosAgenda.agendado_para || null,
            dadosAgenda.duracao_minutos || null,
            fotoUrl || null,
            dadosAgenda.preco || null,
        ]);
        return resultado.rows[0];
    },

    buscarPorId: async (id) => {
        const query = 'SELECT * FROM servicos_solicitados WHERE id = $1';
        const resultado = await pool.query(query, [id]);
        return resultado.rows[0];
    },

    buscarDetalhadoPorId: async (id, usuarioId) => {
        const query = `
            SELECT
                s.*,
                cidadao.nome AS cidadao_nome,
                profissional.nome AS profissional_nome
            FROM servicos_solicitados s
            JOIN usuarios cidadao ON cidadao.id = s.cidadao_id
            JOIN usuarios profissional ON profissional.id = s.prof_id
            WHERE s.id = $1
              AND (s.cidadao_id = $2 OR s.prof_id = $2);
        `;
        const resultado = await pool.query(query, [id, usuarioId]);
        return resultado.rows[0];
    },

    buscarPorProfissional: async (
        profId,
        status = null,
        { page = 1, pageSize = 20 } = {}
    ) => {
        const paginacao = normalizarPaginacao({ page, pageSize });
        let query = `
            SELECT s.*, u.nome AS cidadao_nome, u.email AS cidadao_email
            FROM servicos_solicitados s
            JOIN usuarios u ON s.cidadao_id = u.id
            WHERE s.prof_id = $1
        `;
        const params = [profId];

        if (status) {
            query += ' AND s.status = $2';
            params.push(status);
        }

        const totalResult = await pool.query(
            `SELECT COUNT(*)::int AS total
             FROM servicos_solicitados s
             WHERE s.prof_id = $1${status ? ' AND s.status = $2' : ''};`,
            params
        );

        const paramsListagem = [
            ...params,
            paginacao.limit,
            paginacao.offset,
        ];
        query += ` ORDER BY s.criado_em DESC
                   LIMIT $${paramsListagem.length - 1} OFFSET $${paramsListagem.length};`;
        const resultado = await pool.query(query, paramsListagem);
        const metadados = criarMetadadosPaginacao({
            total: totalResult.rows[0]?.total,
            page: paginacao.page,
            pageSize: paginacao.pageSize,
        });

        return { items: resultado.rows, ...metadados };
    },

    buscarPorCidadao: async (
        cidadaoId,
        status = null,
        { page = 1, pageSize = 20 } = {}
    ) => {
        const paginacao = normalizarPaginacao({ page, pageSize });
        let query = `
            SELECT s.*, u.nome AS profissional_nome
            FROM servicos_solicitados s
            JOIN usuarios u ON s.prof_id = u.id
            WHERE s.cidadao_id = $1
        `;
        const params = [cidadaoId];

        if (status) {
            query += ' AND s.status = $2';
            params.push(status);
        }

        const totalResult = await pool.query(
            `SELECT COUNT(*)::int AS total
             FROM servicos_solicitados s
             WHERE s.cidadao_id = $1${status ? ' AND s.status = $2' : ''};`,
            params
        );

        const paramsListagem = [
            ...params,
            paginacao.limit,
            paginacao.offset,
        ];
        query += ` ORDER BY s.criado_em DESC
                   LIMIT $${paramsListagem.length - 1} OFFSET $${paramsListagem.length};`;
        const resultado = await pool.query(query, paramsListagem);
        const metadados = criarMetadadosPaginacao({
            total: totalResult.rows[0]?.total,
            page: paginacao.page,
            pageSize: paginacao.pageSize,
        });

        return { items: resultado.rows, ...metadados };
    },

    buscarFinanceiroUsuario: async ({
        usuarioId,
        perfilTipo,
        status = null,
        page = 1,
        pageSize = 20,
    }) => {
        const isPrestador = perfilTipo === 'profissional';
        const colunaUsuario = isPrestador ? 's.prof_id' : 's.cidadao_id';
        const colunaContraparte = isPrestador ? 's.cidadao_id' : 's.prof_id';
        const params = [usuarioId];
        const paginacao = normalizarPaginacao({ page, pageSize });

        let filtroStatus = '';
        if (status) {
            params.push(status);
            filtroStatus = ` AND s.status = $${params.length}`;
        }

        const totalResult = await pool.query(
            `SELECT COUNT(*)::int AS total
             FROM servicos_solicitados s
             WHERE ${colunaUsuario} = $1${filtroStatus};`,
            params
        );

        const paramsItens = [
            ...params,
            paginacao.limit,
            paginacao.offset,
        ];
        const itensResult = await pool.query(
            `
            SELECT
                s.id,
                s.servico_nome,
                s.descricao,
                s.status,
                s.preco,
                s.preco_proposto,
                s.agendado_para,
                s.duracao_minutos,
                s.endereco_atendimento,
                s.criado_em,
                s.atualizado_em,
                s.cancelado_em,
                s.politica_cancelamento,
                s.reembolso_status,
                contraparte.id AS contraparte_id,
                contraparte.nome AS contraparte_nome,
                contraparte.email AS contraparte_email
            FROM servicos_solicitados s
            JOIN usuarios contraparte ON contraparte.id = ${colunaContraparte}
            WHERE ${colunaUsuario} = $1
              ${filtroStatus}
            ORDER BY COALESCE(s.agendado_para, s.criado_em) DESC
            LIMIT $${paramsItens.length - 1} OFFSET $${paramsItens.length};
            `,
            paramsItens
        );

        const resumoResult = await pool.query(
            `
            SELECT
                COUNT(*)::int AS total_orcamentos,
                COUNT(*) FILTER (WHERE status IN ('pendente', 'proposta_valor'))::int AS pendentes,
                COUNT(*) FILTER (WHERE status IN ('aceito', 'remarcacao_solicitada', 'aguardando_confirmacao_cliente'))::int AS em_aberto,
                COUNT(*) FILTER (WHERE status = 'concluido')::int AS concluidos,
                COUNT(*) FILTER (WHERE status = 'recusado')::int AS recusados,
                COUNT(*) FILTER (WHERE status = 'cancelado_cliente')::int AS cancelados,
                COALESCE(SUM(preco) FILTER (WHERE status = 'concluido'), 0)::numeric AS total_concluido,
                COALESCE(SUM(COALESCE(preco_proposto, preco)) FILTER (WHERE status IN ('pendente', 'proposta_valor', 'aceito', 'remarcacao_solicitada', 'aguardando_confirmacao_cliente')), 0)::numeric AS total_em_aberto,
                COALESCE(SUM(preco) FILTER (WHERE status = 'cancelado_cliente'), 0)::numeric AS total_cancelado,
                COALESCE(SUM(preco) FILTER (WHERE status = 'recusado'), 0)::numeric AS total_recusado,
                COALESCE(SUM(preco), 0)::numeric AS volume_total
            FROM servicos_solicitados s
            WHERE ${colunaUsuario} = $1;
            `,
            [usuarioId]
        );

        const resumo = resumoResult.rows[0] || {};
        const metadados = criarMetadadosPaginacao({
            total: totalResult.rows[0]?.total,
            page: paginacao.page,
            pageSize: paginacao.pageSize,
        });

        return {
            perfil: isPrestador ? 'prestador' : 'cliente',
            resumo: {
                total_orcamentos: resumo.total_orcamentos || 0,
                pendentes: resumo.pendentes || 0,
                em_aberto: resumo.em_aberto || 0,
                concluidos: resumo.concluidos || 0,
                recusados: resumo.recusados || 0,
                cancelados: resumo.cancelados || 0,
                total_concluido: Number(resumo.total_concluido || 0),
                total_em_aberto: Number(resumo.total_em_aberto || 0),
                total_cancelado: Number(resumo.total_cancelado || 0),
                total_recusado: Number(resumo.total_recusado || 0),
                volume_total: Number(resumo.volume_total || 0),
                label_total_concluido: isPrestador ? 'Total recebido' : 'Total gasto',
                label_total_em_aberto: isPrestador ? 'A receber' : 'Reservado',
            },
            itens: itensResult.rows.map((item) => ({
                ...item,
                preco: item.preco === null ? null : Number(item.preco),
            })),
            paginacao: metadados,
        };
    },

    atualizarStatus: async (id, profId, status) => {
        const statusPermitidos = [
            'pendente',
            'aceito',
            'recusado',
            'cancelado_cliente',
            'remarcacao_solicitada',
        ];
        if (status && !statusPermitidos.includes(status)) {
            return null;
        }

        const query = `
            UPDATE servicos_solicitados
            SET status = COALESCE($1, status),
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = $2 AND prof_id = $3
              AND NOT (status = 'proposta_valor' AND $1 = 'aceito')
            RETURNING *;
        `;
        const resultado = await pool.query(query, [status, id, profId]);
        return resultado.rows[0];
    },

    marcarConclusaoPeloPrestador: async (id, profId) => {
        const resultado = await pool.query(
            `
            UPDATE servicos_solicitados
            SET status = 'aguardando_confirmacao_cliente',
                conclusao_solicitada_em = CURRENT_TIMESTAMP,
                conclusao_confirmada_em = NULL,
                conclusao_confirmada_automaticamente = FALSE,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = $1
              AND prof_id = $2
              AND status = 'aceito'
              AND cardinality(COALESCE(fotos_conclusao, '{}')) > 0
            RETURNING *;
            `,
            [id, profId]
        );
        return resultado.rows[0];
    },

    confirmarConclusaoPeloCliente: async (id, cidadaoId) => {
        const resultado = await pool.query(
            `
            UPDATE servicos_solicitados
            SET status = 'concluido',
                conclusao_confirmada_em = CURRENT_TIMESTAMP,
                conclusao_confirmada_automaticamente = FALSE,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = $1
              AND cidadao_id = $2
              AND status = 'aguardando_confirmacao_cliente'
            RETURNING *;
            `,
            [id, cidadaoId]
        );
        return resultado.rows[0];
    },

    proporValor: async (id, profId, precoProposto, motivo = null) => {
        const query = `
            UPDATE servicos_solicitados
            SET status = 'proposta_valor',
                preco_proposto = $3,
                motivo_proposta_valor = COALESCE($4, motivo_proposta_valor),
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = $1
              AND prof_id = $2
              AND status IN ('pendente', 'proposta_valor')
            RETURNING *;
        `;
        const resultado = await pool.query(query, [id, profId, precoProposto, motivo]);
        return resultado.rows[0];
    },

    aceitarPropostaValor: async (id, cidadaoId) => {
        const query = `
            UPDATE servicos_solicitados
            SET status = 'pendente',
                preco = preco_proposto,
                preco_proposto = NULL,
                motivo_proposta_valor = NULL,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = $1
              AND cidadao_id = $2
              AND status = 'proposta_valor'
              AND preco_proposto IS NOT NULL
            RETURNING *;
        `;
        const resultado = await pool.query(query, [id, cidadaoId]);
        return resultado.rows[0];
    },

    recusarPropostaValor: async (id, cidadaoId) => {
        const query = `
            UPDATE servicos_solicitados
            SET status = 'pendente',
                preco_proposto = NULL,
                motivo_proposta_valor = NULL,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = $1
              AND cidadao_id = $2
              AND status = 'proposta_valor'
            RETURNING *;
        `;
        const resultado = await pool.query(query, [id, cidadaoId]);
        return resultado.rows[0];
    },

    adicionarFotosConclusao: async (id, profId, fotos) => {
        const query = `
            UPDATE servicos_solicitados
            SET fotos_conclusao = COALESCE(fotos_conclusao, '{}') || $3::text[],
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = $1
              AND prof_id = $2
              AND status = 'aceito'
            RETURNING *;
        `;

        const resultado = await pool.query(query, [id, profId, fotos]);
        return resultado.rows[0];
    },

    cancelarPeloCliente: async (
        id,
        cidadaoId,
        motivoCancelamento = null,
        politicaCancelamento = null,
        reembolsoStatus = null
    ) => {
        const query = `
            UPDATE servicos_solicitados
            SET status = 'cancelado_cliente',
                motivo_cancelamento = COALESCE($3, motivo_cancelamento),
                cancelado_em = CURRENT_TIMESTAMP,
                cancelado_por = $2,
                politica_cancelamento = $4,
                reembolso_status = $5,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = $1
              AND cidadao_id = $2
              AND status IN ('pendente', 'proposta_valor', 'aceito', 'remarcacao_solicitada')
            RETURNING *;
        `;

        const resultado = await pool.query(query, [
            id,
            cidadaoId,
            motivoCancelamento,
            politicaCancelamento,
            reembolsoStatus,
        ]);
        return resultado.rows[0];
    },

    solicitarRemarcacao: async (id, profId, novaDataHora, motivoRemarcacao = null) => {
        const query = `
            UPDATE servicos_solicitados
            SET status = 'remarcacao_solicitada',
                remarcacao_solicitada_para = $3,
                motivo_remarcacao = COALESCE($4, motivo_remarcacao),
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = $1
              AND prof_id = $2
              AND status IN ('pendente', 'aceito')
            RETURNING *;
        `;

        const resultado = await pool.query(query, [
            id,
            profId,
            novaDataHora,
            motivoRemarcacao,
        ]);

        return resultado.rows[0];
    },

    aceitarRemarcacao: async (id, cidadaoId) => {
        const query = `
            UPDATE servicos_solicitados
            SET status = 'aceito',
                agendado_para = remarcacao_solicitada_para,
                remarcacao_solicitada_para = NULL,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = $1
              AND cidadao_id = $2
              AND status = 'remarcacao_solicitada'
              AND remarcacao_solicitada_para IS NOT NULL
            RETURNING *;
        `;

        const resultado = await pool.query(query, [id, cidadaoId]);
        return resultado.rows[0];
    },

    recusarRemarcacao: async (id, cidadaoId) => {
        const query = `
            UPDATE servicos_solicitados
            SET status = 'aceito',
                remarcacao_solicitada_para = NULL,
                motivo_remarcacao = NULL,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = $1
              AND cidadao_id = $2
              AND status = 'remarcacao_solicitada'
            RETURNING *;
        `;

        const resultado = await pool.query(query, [id, cidadaoId]);
        return resultado.rows[0];
    },
};

module.exports = ServicoModel;
