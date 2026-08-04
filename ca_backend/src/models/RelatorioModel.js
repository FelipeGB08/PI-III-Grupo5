const pool = require('../config/db');

const RelatorioModel = {
    obterEstatisticas: async () => {
        const queryDemandasPorCidade = `
            SELECT u.cidade_amauc AS municipio, COUNT(s.id) AS total_demandas
            FROM servicos_solicitados s
            JOIN usuarios u ON s.prof_id = u.id
            GROUP BY u.cidade_amauc
            ORDER BY total_demandas DESC, municipio ASC;
        `;

        const queryStatus = `
            SELECT status, COUNT(id) AS quantidade
            FROM servicos_solicitados
            GROUP BY status
            ORDER BY quantidade DESC, status ASC;
        `;

        const queryPrestadoresMaisBemAvaliados = `
            SELECT u.id AS profissional_id,
                   u.nome AS profissional_nome,
                   COALESCE(ROUND(AVG(a.nota_estrelas)::numeric, 2), 0) AS nota_media,
                   COUNT(a.id)::int AS total_avaliacoes
            FROM usuarios u
            LEFT JOIN servicos_solicitados s ON s.prof_id = u.id
            LEFT JOIN avaliacoes a ON a.servico_id = s.id
            WHERE u.perfil_tipo = 'profissional'
              AND u.ativo = TRUE
            GROUP BY u.id, u.nome
            HAVING COUNT(a.id) > 0
            ORDER BY nota_media DESC, total_avaliacoes DESC, u.nome ASC
            LIMIT 10;
        `;

        const queryChamadosPorCategoria = `
            SELECT c.id AS categoria_id,
                   c.nome_servico AS categoria,
                   COUNT(DISTINCT s.id)::int AS total_chamados
            FROM categorias c
            LEFT JOIN servicos_solicitados s ON s.categoria_id = c.id
            GROUP BY c.id, c.nome_servico
            ORDER BY total_chamados DESC, categoria ASC;
        `;

        const queryTaxaCancelamentoPorPrestador = `
            SELECT u.id AS profissional_id,
                   u.nome AS profissional_nome,
                   COUNT(s.id)::int AS total_chamados,
                   COUNT(*) FILTER (WHERE s.status = 'cancelado_cliente')::int
                       AS total_cancelados,
                   COALESCE(
                       ROUND(
                           (COUNT(*) FILTER (WHERE s.status = 'cancelado_cliente'))
                           * 100.0 / NULLIF(COUNT(s.id), 0),
                           2
                       ),
                       0
                   ) AS taxa_cancelamento
            FROM usuarios u
            LEFT JOIN servicos_solicitados s ON s.prof_id = u.id
            WHERE u.perfil_tipo = 'profissional'
              AND u.ativo = TRUE
            GROUP BY u.id, u.nome
            HAVING COUNT(s.id) > 0
            ORDER BY taxa_cancelamento DESC, total_chamados DESC, u.nome ASC;
        `;

        const queryVerificacoesPendentes = `
            SELECT COUNT(*)::int AS total
            FROM perfis_profissionais
            WHERE status_verificacao = 'pendente';
        `;

        const queryDenunciasAbertas = `
            SELECT COUNT(*)::int AS total
            FROM denuncias
            WHERE status = 'aberta';
        `;

        const [
            demandas,
            status,
            prestadores,
            categorias,
            cancelamentos,
            verificacoes,
            denuncias,
        ] = await Promise.all([
            pool.query(queryDemandasPorCidade),
            pool.query(queryStatus),
            pool.query(queryPrestadoresMaisBemAvaliados),
            pool.query(queryChamadosPorCategoria),
            pool.query(queryTaxaCancelamentoPorPrestador),
            pool.query(queryVerificacoesPendentes),
            pool.query(queryDenunciasAbertas),
        ]);

        return {
            demandas_por_municipio: demandas.rows,
            resumo_status: status.rows,
            prestadores_mais_bem_avaliados: prestadores.rows,
            chamados_por_categoria: categorias.rows,
            taxa_cancelamento_por_prestador: cancelamentos.rows,
            verificacoes_pendentes: Number(verificacoes.rows[0]?.total || 0),
            denuncias_abertas: Number(denuncias.rows[0]?.total || 0),
        };
    },
};

module.exports = RelatorioModel;
