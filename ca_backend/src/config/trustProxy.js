function configurarTrustProxy(app, env = process.env) {
    const padrao = env.NODE_ENV === 'production' ? 1 : 0;
    const hops = Number(env.TRUST_PROXY_HOPS || padrao);
    if (!Number.isInteger(hops) || hops < 0 || hops > 5) {
        throw new Error('TRUST_PROXY_HOPS deve ser um inteiro entre 0 e 5.');
    }
    if (hops > 0) app.set('trust proxy', hops);
    return hops;
}

module.exports = {
    configurarTrustProxy,
};
