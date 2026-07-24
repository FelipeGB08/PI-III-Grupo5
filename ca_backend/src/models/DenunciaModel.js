const pool = require('../config/db');

const DenunciaModel = {
    criar: async ({ servicoSolicitadoId, denuncianteId, motivo, descricao }) => {
        const resultado = await pool.query(
            `
            WITH servico_participante AS (
                SELECT id
                FROM servicos_solicitados
                WHERE id = $1
                  AND (cidadao_id = $2 OR prof_id = $2)
            )
            INSERT INTO denuncias (
                servico_solicitado_id,
                denunciante_id,
                motivo,
                descricao,
                status
            )
            SELECT id, $2, $3, $4, 'aberta'
            FROM servico_participante
            RETURNING *;
            `,
            [servicoSolicitadoId, denuncianteId, motivo, descricao]
        );
        return resultado.rows[0];
    },

    listarParaAdmin: async (status = null) => {
        const parametros = [];
        const filtro = status
            ? (() => {
                parametros.push(status);
                return 'WHERE d.status = $1';
            })()
            : '';

        const resultado = await pool.query(
            `
            SELECT
                d.id,
                d.servico_solicitado_id,
                d.denunciante_id,
                d.motivo,
                d.status,
                d.criado_em,
                d.resolvido_em,
                denunciante.nome AS denunciante_nome,
                s.servico_nome,
                s.status AS servico_status,
                s.agendado_para
            FROM denuncias d
            JOIN usuarios denunciante ON denunciante.id = d.denunciante_id
            JOIN servicos_solicitados s ON s.id = d.servico_solicitado_id
            ${filtro}
            ORDER BY
                CASE d.status
                    WHEN 'aberta' THEN 0
                    WHEN 'em_analise' THEN 1
                    WHEN 'resolvida' THEN 2
                    ELSE 3
                END,
                d.criado_em DESC;
            `,
            parametros
        );
        return resultado.rows;
    },

    buscarDetalheParaAdmin: async (denunciaId) => {
        const resultado = await pool.query(
            `
            SELECT
                d.*,
                denunciante.nome AS denunciante_nome,
                denunciante.perfil_tipo AS denunciante_perfil_tipo,
                revisor.nome AS resolvido_por_nome,
                json_build_object(
                    'id', s.id,
                    'status', s.status,
                    'servico_nome', s.servico_nome,
                    'descricao', s.descricao,
                    'agendado_para', s.agendado_para,
                    'criado_em', s.criado_em,
                    'atualizado_em', s.atualizado_em,
                    'preco', s.preco,
                    'preco_proposto', s.preco_proposto,
                    'motivo_proposta_valor', s.motivo_proposta_valor,
                    'foto_url', s.foto_url,
                    'fotos_conclusao', s.fotos_conclusao,
                    'motivo_cancelamento', s.motivo_cancelamento,
                    'cancelado_em', s.cancelado_em,
                    'politica_cancelamento', s.politica_cancelamento,
                    'reembolso_status', s.reembolso_status,
                    'motivo_remarcacao', s.motivo_remarcacao,
                    'remarcacao_solicitada_para', s.remarcacao_solicitada_para,
                    'conclusao_solicitada_em', s.conclusao_solicitada_em,
                    'conclusao_confirmada_em', s.conclusao_confirmada_em,
                    'conclusao_confirmada_automaticamente', s.conclusao_confirmada_automaticamente,
                    'cliente', json_build_object('id', cliente.id, 'nome', cliente.nome),
                    'profissional', json_build_object('id', profissional.id, 'nome', profissional.nome)
                ) AS servico
            FROM denuncias d
            JOIN servicos_solicitados s ON s.id = d.servico_solicitado_id
            JOIN usuarios denunciante ON denunciante.id = d.denunciante_id
            JOIN usuarios cliente ON cliente.id = s.cidadao_id
            JOIN usuarios profissional ON profissional.id = s.prof_id
            LEFT JOIN usuarios revisor ON revisor.id = d.resolvido_por
            WHERE d.id = $1;
            `,
            [denunciaId]
        );
        return resultado.rows[0];
    },

    atualizarPorAdmin: async ({ denunciaId, adminId, status, resolucaoAdmin }) => {
        const resultado = await pool.query(
            `
            WITH anterior AS (
                SELECT id, status
                FROM denuncias
                WHERE id = $1
                FOR UPDATE
            )
            UPDATE denuncias d
            SET
                status = $2,
                resolucao_admin = CASE
                    WHEN $2 IN ('resolvida', 'arquivada') THEN $3
                    ELSE NULL
                END,
                resolvido_em = CASE
                    WHEN $2 IN ('resolvida', 'arquivada') THEN CURRENT_TIMESTAMP
                    ELSE NULL
                END,
                resolvido_por = CASE
                    WHEN $2 IN ('resolvida', 'arquivada') THEN $4
                    ELSE NULL
                END
            FROM anterior
            WHERE d.id = anterior.id
            RETURNING d.*, anterior.status AS status_anterior;
            `,
            [denunciaId, status, resolucaoAdmin || null, adminId]
        );
        return resultado.rows[0];
    },
};

module.exports = DenunciaModel;
