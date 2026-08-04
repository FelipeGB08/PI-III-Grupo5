const RelatorioModel = require('../models/RelatorioModel');
const logger = require('../utils/logger');

function escaparCsv(valor) {
    const texto = valor === null || valor === undefined ? '' : String(valor);
    const seguro = /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;
    return `"${seguro.replace(/"/g, '""')}"`;
}

function adicionarSecaoCsv(linhas, titulo, cabecalhos, registros, campos) {
    linhas.push(titulo);
    linhas.push(cabecalhos.map(escaparCsv).join(','));
    for (const registro of registros || []) {
        linhas.push(campos.map((campo) => escaparCsv(registro?.[campo])).join(','));
    }
    linhas.push('');
}

function montarCsv(estatisticas) {
    const linhas = ['Relatorio administrativo - Conecta AMAUC', ''];

    adicionarSecaoCsv(
        linhas,
        'Resumo por status',
        ['Status', 'Quantidade'],
        estatisticas.resumo_status,
        ['status', 'quantidade']
    );
    adicionarSecaoCsv(
        linhas,
        'Demandas por municipio',
        ['Municipio', 'Total de demandas'],
        estatisticas.demandas_por_municipio,
        ['municipio', 'total_demandas']
    );
    adicionarSecaoCsv(
        linhas,
        'Prestadores mais bem avaliados',
        ['ID do prestador', 'Prestador', 'Nota media', 'Total de avaliacoes'],
        estatisticas.prestadores_mais_bem_avaliados,
        ['profissional_id', 'profissional_nome', 'nota_media', 'total_avaliacoes']
    );
    adicionarSecaoCsv(
        linhas,
        'Chamados por categoria',
        ['ID da categoria', 'Categoria', 'Total de chamados'],
        estatisticas.chamados_por_categoria,
        ['categoria_id', 'categoria', 'total_chamados']
    );
    adicionarSecaoCsv(
        linhas,
        'Taxa de cancelamento por prestador',
        ['ID do prestador', 'Prestador', 'Total de chamados', 'Cancelados', 'Taxa de cancelamento (%)'],
        estatisticas.taxa_cancelamento_por_prestador,
        ['profissional_id', 'profissional_nome', 'total_chamados', 'total_cancelados', 'taxa_cancelamento']
    );
    adicionarSecaoCsv(
        linhas,
        'Moderacao',
        ['Verificacoes pendentes', 'Denuncias abertas'],
        [{
            verificacoes_pendentes: estatisticas.verificacoes_pendentes,
            denuncias_abertas: estatisticas.denuncias_abertas,
        }],
        ['verificacoes_pendentes', 'denuncias_abertas']
    );

    return `\uFEFF${linhas.join('\r\n')}`;
}

function usuarioEhAdmin(req) {
    const perfil = req.usuarioLogado?.perfil_tipo || req.usuarioLogado?.tipo_usuario;
    return perfil === 'admin';
}

const RelatorioController = {
    gerarRelatorio: async (req, res) => {
        try {
            if (!usuarioEhAdmin(req)) {
                return res.status(403).json({ erro: 'Acesso negado. Apenas administradores podem ver os relatorios.' });
            }

            const estatisticas = await RelatorioModel.obterEstatisticas();
            return res.status(200).json(estatisticas);
        } catch (erro) {
            logger.error('Erro ao gerar relatorios administrativos.', {
                erro,
                componente: 'relatorios',
            });
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },

    exportarCsv: async (req, res) => {
        try {
            if (!usuarioEhAdmin(req)) {
                return res.status(403).json({ erro: 'Acesso negado. Apenas administradores podem exportar relatorios.' });
            }

            const estatisticas = await RelatorioModel.obterEstatisticas();
            const csv = montarCsv(estatisticas);

            res.set('Content-Type', 'text/csv; charset=utf-8');
            res.attachment('relatorio-conecta-amauc.csv');
            return res.status(200).send(csv);
        } catch (erro) {
            logger.error('Erro ao exportar relatorio administrativo.', {
                erro,
                componente: 'relatorios',
            });
            return res.status(500).json({ erro: 'Erro interno no servidor.' });
        }
    },
};

module.exports = RelatorioController;
