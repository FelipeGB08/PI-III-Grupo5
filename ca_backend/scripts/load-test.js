'use strict';

const autocannon = require('autocannon');

const CONFIRMACAO_EXIGIDA = 'AUTORIZO_TESTE_DE_CARGA';
const MAX_AMOSTRAS_LATENCIA = 500000;

function erroDeConfiguracao(mensagem) {
    const erro = new Error(mensagem);
    erro.name = 'ErroDeConfiguracao';
    return erro;
}

function exigirVariavel(nome) {
    const valor = String(process.env[nome] || '').trim();
    if (!valor) {
        throw erroDeConfiguracao(`Defina a variavel ${nome} antes de executar o teste de carga.`);
    }
    return valor;
}

function lerInteiro(nome, valorPadrao, minimo, maximo) {
    const bruto = process.env[nome];
    if (bruto === undefined || String(bruto).trim() === '') return valorPadrao;

    const valor = Number(bruto);
    if (!Number.isInteger(valor) || valor < minimo || valor > maximo) {
        throw erroDeConfiguracao(
            `${nome} deve ser um inteiro entre ${minimo} e ${maximo}.`,
        );
    }
    return valor;
}

function lerJson(nome) {
    const valor = exigirVariavel(nome);
    try {
        return JSON.parse(valor);
    } catch {
        throw erroDeConfiguracao(`${nome} deve conter JSON valido.`);
    }
}

function normalizarBaseUrl(valor) {
    let url;
    try {
        url = new URL(valor);
    } catch {
        throw erroDeConfiguracao('LOAD_TEST_BASE_URL deve ser uma URL HTTP(S) valida.');
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
        throw erroDeConfiguracao('LOAD_TEST_BASE_URL deve usar http ou https.');
    }

    if (url.username || url.password || url.search || url.hash) {
        throw erroDeConfiguracao('LOAD_TEST_BASE_URL nao deve conter credenciais, query string ou hash.');
    }

    const caminho = url.pathname.replace(/\/+$/, '');
    if (caminho !== '/api/v1') {
        throw erroDeConfiguracao(
            'LOAD_TEST_BASE_URL deve incluir o prefixo canonico /api/v1, por exemplo https://api.exemplo.com/api/v1.',
        );
    }

    return `${url.origin}${caminho}`;
}

function montarUrl(baseUrl, caminho) {
    return `${baseUrl}${caminho.startsWith('/') ? caminho : `/${caminho}`}`;
}

function credenciaisPrincipais() {
    const email = String(process.env.LOAD_TEST_LOGIN_EMAIL || '').trim();
    const senha = process.env.LOAD_TEST_PASSWORD || '';

    if ((email && !senha) || (!email && senha)) {
        throw erroDeConfiguracao(
            'Defina LOAD_TEST_LOGIN_EMAIL e LOAD_TEST_PASSWORD juntos, ou use LOAD_TEST_ACCESS_TOKEN.',
        );
    }

    return email ? { email, senha } : null;
}

function validarPayloadDeLogin(payload, indice) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw erroDeConfiguracao(`LOAD_TEST_LOGIN_PAYLOADS[${indice}] deve ser um objeto.`);
    }

    const email = String(payload.email || '').trim();
    const senha = typeof payload.senha === 'string' ? payload.senha : '';
    if (!email || !senha) {
        throw erroDeConfiguracao(
            `LOAD_TEST_LOGIN_PAYLOADS[${indice}] precisa conter email e senha.`,
        );
    }

    return { email, senha };
}

function obterPayloadsDeLogin(credenciais) {
    const bruto = String(process.env.LOAD_TEST_LOGIN_PAYLOADS || '').trim();
    if (!bruto) return credenciais ? [credenciais] : [];

    let dados;
    try {
        dados = JSON.parse(bruto);
    } catch {
        throw erroDeConfiguracao('LOAD_TEST_LOGIN_PAYLOADS deve conter um array JSON valido.');
    }

    if (!Array.isArray(dados) || dados.length === 0) {
        throw erroDeConfiguracao('LOAD_TEST_LOGIN_PAYLOADS deve conter pelo menos uma conta de teste.');
    }

    return dados.map(validarPayloadDeLogin);
}

function validarPayloadDeCriacao(payload, indice) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw erroDeConfiguracao(`Payload de criacao ${indice + 1} deve ser um objeto JSON.`);
    }

    const camposObrigatorios = [
        'profissional_id',
        'agenda_servico_id',
        'descricao',
        'agendado_para',
    ];
    const ausentes = camposObrigatorios.filter((campo) => {
        const valor = payload[campo];
        return valor === undefined || valor === null || String(valor).trim() === '';
    });

    if (ausentes.length > 0) {
        throw erroDeConfiguracao(
            `Payload de criacao ${indice + 1} sem os campos obrigatorios: ${ausentes.join(', ')}.`,
        );
    }

    return payload;
}

function obterPayloadsDeCriacao() {
    if (process.env.LOAD_TEST_ENABLE_CREATE !== 'true') return [];

    if (process.env.LOAD_TEST_ENVIRONMENT !== 'staging') {
        throw erroDeConfiguracao(
            'A criacao de solicitacoes so e permitida com LOAD_TEST_ENVIRONMENT=staging.',
        );
    }

    const dados = lerJson('LOAD_TEST_CREATE_BODY');
    const payloads = Array.isArray(dados) ? dados : [dados];
    if (payloads.length === 0) {
        throw erroDeConfiguracao('LOAD_TEST_CREATE_BODY deve conter ao menos um payload.');
    }
    if (payloads.length > 20) {
        throw erroDeConfiguracao(
            'Forneca no maximo 20 payloads de criacao por execucao para respeitar o limite por usuario.',
        );
    }

    return payloads.map(validarPayloadDeCriacao);
}

async function obterAccessToken(baseUrl, credenciais) {
    if (!credenciais) {
        throw erroDeConfiguracao(
            'Defina LOAD_TEST_ACCESS_TOKEN ou as credenciais de teste para medir a listagem.',
        );
    }

    const resposta = await fetch(montarUrl(baseUrl, '/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credenciais),
    });
    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
        throw new Error(`A autenticacao inicial falhou com HTTP ${resposta.status}.`);
    }

    const accessToken = dados.access_token || dados.token;
    if (!accessToken) {
        throw new Error('A autenticacao inicial nao retornou access_token.');
    }

    return accessToken;
}

function calcularPercentil(valores, percentil) {
    if (valores.length === 0) return null;

    const ordenados = [...valores].sort((a, b) => a - b);
    const posicao = (ordenados.length - 1) * percentil;
    const inferior = Math.floor(posicao);
    const superior = Math.ceil(posicao);
    const fracao = posicao - inferior;
    return ordenados[inferior] + ((ordenados[superior] - ordenados[inferior]) * fracao);
}

function formatarNumero(valor, casas = 2) {
    return valor === null || valor === undefined ? '-' : Number(valor).toFixed(casas);
}

function resumirCodigos(codigos) {
    return Object.fromEntries(
        Object.entries(codigos)
            .sort(([a], [b]) => Number(a) - Number(b)),
    );
}

function executarCenario(nome, opcoes) {
    return new Promise((resolve, reject) => {
        const statusCodes = {};
        const latenciasDeSucesso = [];
        let amostrasTruncadas = false;

        const instancia = autocannon({
            pipelining: 1,
            timeout: 30,
            renderProgressBar: false,
            renderResultsTable: false,
            ...opcoes,
        }, (erro, resultado) => {
            if (erro) {
                reject(erro);
                return;
            }

            const respostas2xx = Object.entries(statusCodes)
                .filter(([codigo]) => Number(codigo) >= 200 && Number(codigo) < 300)
                .reduce((total, [, quantidade]) => total + quantidade, 0);
            const respostas4xx = Object.entries(statusCodes)
                .filter(([codigo]) => Number(codigo) >= 400 && Number(codigo) < 500)
                .reduce((total, [, quantidade]) => total + quantidade, 0);
            const respostas5xx = Object.entries(statusCodes)
                .filter(([codigo]) => Number(codigo) >= 500 && Number(codigo) < 600)
                .reduce((total, [, quantidade]) => total + quantidade, 0);

            resolve({
                cenario: nome,
                conexoes: resultado.connections,
                duracaoSegundos: Number(resultado.duration.toFixed(2)),
                requisicoesPorSegundo: Number(resultado.requests.average.toFixed(2)),
                latenciaP95Ms: calcularPercentil(latenciasDeSucesso, 0.95),
                respostas2xx,
                respostas4xx,
                respostas5xx,
                errosDeRede: resultado.errors,
                timeouts: resultado.timeouts,
                statusCodes: resumirCodigos(statusCodes),
                amostrasP95: latenciasDeSucesso.length,
                amostrasP95Truncadas: amostrasTruncadas,
            });
        });

        instancia.on('response', (_cliente, statusCode, _bytes, responseTime) => {
            const codigo = String(statusCode);
            statusCodes[codigo] = (statusCodes[codigo] || 0) + 1;

            if (
                statusCode >= 200
                && statusCode < 300
                && Number.isFinite(responseTime)
            ) {
                if (latenciasDeSucesso.length < MAX_AMOSTRAS_LATENCIA) {
                    latenciasDeSucesso.push(responseTime);
                } else {
                    amostrasTruncadas = true;
                }
            }
        });
    });
}

function exibirResumo(resultados) {
    const linhas = resultados.map((resultado) => ({
        cenario: resultado.cenario,
        conexoes: resultado.conexoes,
        duracao_s: formatarNumero(resultado.duracaoSegundos),
        rps_medio: formatarNumero(resultado.requisicoesPorSegundo),
        p95_ms_2xx: formatarNumero(resultado.latenciaP95Ms),
        respostas_2xx: resultado.respostas2xx,
        respostas_4xx: resultado.respostas4xx,
        respostas_5xx: resultado.respostas5xx,
        erros_rede: resultado.errosDeRede,
        timeouts: resultado.timeouts,
    }));

    console.log('\nResultado do teste de carga:');
    console.table(linhas);
    console.log('Detalhes (sem senhas ou tokens):');
    console.log(JSON.stringify(resultados, null, 2));
}

async function main() {
    if (process.env.LOAD_TEST_CONFIRM !== CONFIRMACAO_EXIGIDA) {
        throw erroDeConfiguracao(
            `Defina LOAD_TEST_CONFIRM=${CONFIRMACAO_EXIGIDA} para evitar uma execucao acidental.`,
        );
    }

    const baseUrl = normalizarBaseUrl(exigirVariavel('LOAD_TEST_BASE_URL'));
    const conexoes = lerInteiro('LOAD_TEST_CONNECTIONS', 5, 1, 100);
    const duracao = lerInteiro('LOAD_TEST_DURATION_SECONDS', 30, 1, 300);
    const requisicoesPorConta = lerInteiro(
        'LOAD_TEST_LOGIN_REQUESTS_PER_ACCOUNT',
        1,
        1,
        9,
    );
    const credenciais = credenciaisPrincipais();
    const payloadsLogin = obterPayloadsDeLogin(credenciais);
    const payloadsCriacao = obterPayloadsDeCriacao();
    const resultados = [];

    console.log(`[Carga] Alvo: ${baseUrl}`);
    console.log(`[Carga] Conexoes: ${conexoes}; duracao da listagem: ${duracao}s.`);

    if (payloadsLogin.length > 0) {
        if (payloadsLogin.length === 1) {
            console.warn(
                '[Carga] Login com uma unica conta: a amostra e limitada para nao acionar o rate limit. Use LOAD_TEST_LOGIN_PAYLOADS com varias contas de staging para uma medicao representativa.',
            );
        }

        resultados.push(await executarCenario('Login', {
            url: montarUrl(baseUrl, '/auth/login'),
            connections: Math.min(conexoes, payloadsLogin.length),
            amount: payloadsLogin.length * requisicoesPorConta,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            requests: payloadsLogin.map((payload) => ({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })),
        }));
    } else {
        console.warn('[Carga] Cenario de login ignorado: nenhuma credencial de teste foi fornecida.');
    }

    const accessToken = process.env.LOAD_TEST_ACCESS_TOKEN || await obterAccessToken(baseUrl, credenciais);
    const headersAutenticados = { Authorization: `Bearer ${accessToken}` };

    resultados.push(await executarCenario('Listagem de chamados', {
        url: montarUrl(baseUrl, '/solicitacoes/meus-pedidos?page=1&pageSize=20'),
        connections: conexoes,
        duration: duracao,
        method: 'GET',
        headers: headersAutenticados,
    }));

    if (payloadsCriacao.length > 0) {
        let proximoPayload = 0;
        resultados.push(await executarCenario('Criacao de solicitacoes (staging)', {
            url: montarUrl(baseUrl, '/solicitacoes'),
            connections: Math.min(conexoes, payloadsCriacao.length),
            amount: payloadsCriacao.length,
            method: 'POST',
            headers: {
                ...headersAutenticados,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payloadsCriacao[0]),
            requests: [{
                method: 'POST',
                headers: {
                    ...headersAutenticados,
                    'Content-Type': 'application/json',
                },
                setupRequest: (request) => {
                    request.body = JSON.stringify(payloadsCriacao[proximoPayload % payloadsCriacao.length]);
                    proximoPayload += 1;
                    return request;
                },
            }],
        }));
    }

    exibirResumo(resultados);

    const possuiFalha = resultados.some((resultado) => (
        resultado.respostas4xx > 0
        || resultado.respostas5xx > 0
        || resultado.errosDeRede > 0
        || resultado.timeouts > 0
    ));
    if (possuiFalha) {
        process.exitCode = 1;
    }
}

main().catch((erro) => {
    console.error(`[Carga] ${erro.message}`);
    process.exitCode = 1;
});
