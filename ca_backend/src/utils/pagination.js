function parsePagination(query = {}) {
    const page = Math.max(1, Number.parseInt(query.page || query.pagina || '1', 10) || 1);
    const requestedLimit = Number.parseInt(query.limit || query.tamanho || '20', 10) || 20;
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

module.exports = {
    parsePagination,
    setPaginationHeaders,
};
