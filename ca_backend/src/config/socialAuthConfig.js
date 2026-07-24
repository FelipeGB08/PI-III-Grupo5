const CONFIGURACOES_SOCIAIS = [
    {
        provedor: 'GOOGLE',
        variaveis: ['GOOGLE_CLIENT_ID'],
        impacto: 'O backend nao conseguira validar o audience dos ID tokens Google.',
    },
    {
        provedor: 'APPLE',
        variaveis: ['APPLE_IOS_CLIENT_ID', 'APPLE_SERVICES_ID'],
        impacto: 'O backend nao conseguira validar os audiences de iOS e Android/Web dos identity tokens Apple.',
    },
    {
        provedor: 'GITHUB',
        variaveis: [
            'GITHUB_CLIENT_ID',
            'GITHUB_CLIENT_SECRET',
            'GITHUB_REDIRECT_URI',
            'GITHUB_WEB_REDIRECT_URI',
        ],
        impacto: 'O OAuth Authorization Code do GitHub nao podera ser concluido.',
    },
];

function valorDeProducao(valor) {
    const normalizado = String(valor || '').trim();
    if (!normalizado) return false;
    return !/^(seu_|sua_|troque_|substitua_)/i.test(normalizado);
}

function avisarCredenciaisSociaisAusentes(env = process.env, logger = console) {
    if (env.NODE_ENV !== 'production') return [];

    const avisos = [];
    for (const configuracao of CONFIGURACOES_SOCIAIS) {
        const ausentes = configuracao.variaveis.filter(
            (nome) => !valorDeProducao(env[nome])
        );
        if (ausentes.length === 0) continue;

        const mensagem =
            `[AUTH_SOCIAL][${configuracao.provedor}][AVISO] Credenciais de producao ausentes ` +
            `ou ainda com placeholder: ${ausentes.join(', ')}. ${configuracao.impacto}`;
        logger.warn(mensagem);
        avisos.push({ provedor: configuracao.provedor, ausentes });
    }

    return avisos;
}

module.exports = {
    avisarCredenciaisSociaisAusentes,
};
