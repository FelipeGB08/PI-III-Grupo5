function apiDocsEnabled(env = process.env) {
    return env.ENABLE_API_DOCS === 'true' || (
        env.ENABLE_API_DOCS !== 'false' &&
        env.NODE_ENV !== 'production'
    );
}

module.exports = { apiDocsEnabled };
