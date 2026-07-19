const PAGINA_PADRAO = 1;
const TAMANHO_PADRAO = 20;
const TAMANHO_MAXIMO = 100;

function parsePagination(query = {}) {
    const page = Math.max(
        1,
        Number.parseInt(query.page || query.pagina || '1', 10) || 1
    );
    const requestedLimit =
        Number.parseInt(query.limit || query.tamanho || '20', 10) || 20;
    const limit = Math.min(50, Math.max(1, requestedLimit));

    return {
        page,
        limit,
        offset: (page - 1) * limit,
    };
}

function setPaginationHeaders(res, { total, page, limit }) {
    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.setHeader('X-Total-Count', String(total));
    res.setHeader('X-Page', String(page));
    res.setHeader('X-Limit', String(limit));
    res.setHeader('X-Total-Pages', String(totalPages));
}

function inteiroPositivo(valor, fallback) {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0 ? numero : fallback;
}

function normalizarPaginacao({ page, pageSize } = {}) {
    const pagina = inteiroPositivo(page, PAGINA_PADRAO);
    const tamanho = Math.min(
        inteiroPositivo(pageSize, TAMANHO_PADRAO),
        TAMANHO_MAXIMO
    );

    return {
        page: pagina,
        pageSize: tamanho,
        limit: tamanho,
        offset: (pagina - 1) * tamanho,
    };
}

function criarMetadadosPaginacao({ total, page, pageSize }) {
    const totalRegistros = Number(total) || 0;
    const totalPages = totalRegistros === 0
        ? 0
        : Math.ceil(totalRegistros / pageSize);

    return {
        total: totalRegistros,
        page,
        pageSize,
        totalPages,
        hasMore: page < totalPages,
    };
}

module.exports = {
    criarMetadadosPaginacao,
    normalizarPaginacao,
    parsePagination,
    setPaginationHeaders,
};
