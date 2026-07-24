const CHAVES_ENV = [
    'NODE_ENV',
    'DATABASE_URL',
    'DB_USER',
    'DB_PASSWORD',
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
];

const ambienteOriginal = Object.fromEntries(
    CHAVES_ENV.map((chave) => [chave, process.env[chave]])
);

function definirEnv(chave, valor) {
    if (valor === undefined) {
        delete process.env[chave];
    } else {
        process.env[chave] = valor;
    }
}

function carregarPoolComMock(ambiente) {
    jest.resetModules();
    for (const chave of CHAVES_ENV) {
        definirEnv(chave, ambiente[chave]);
    }

    const poolCriado = {
        connect: jest.fn(),
        query: jest.fn(),
    };
    const Pool = jest.fn(() => poolCriado);
    jest.doMock('pg', () => ({ Pool }));

    const exportado = require('../../src/config/db');
    return { Pool, exportado, poolCriado };
}

describe('configuracao do pool PostgreSQL', () => {
    afterAll(() => {
        for (const [chave, valor] of Object.entries(ambienteOriginal)) {
            definirEnv(chave, valor);
        }
        jest.dontMock('pg');
        jest.resetModules();
    });

    test('configura timeout de conexao ao usar DATABASE_URL', () => {
        const { Pool, exportado, poolCriado } = carregarPoolComMock({
            NODE_ENV: 'test',
            DATABASE_URL: 'postgresql://usuario:senha@db/conecta',
        });

        expect(exportado).toBe(poolCriado);
        expect(Pool).toHaveBeenCalledWith({
            connectionString: 'postgresql://usuario:senha@db/conecta',
            connectionTimeoutMillis: 5000,
        });
        expect(poolCriado.connect).not.toHaveBeenCalled();
    });

    test('configura timeout de conexao ao usar variaveis DB_*', () => {
        const { Pool } = carregarPoolComMock({
            NODE_ENV: 'test',
            DATABASE_URL: undefined,
            DB_USER: 'conecta',
            DB_PASSWORD: 'senha',
            DB_HOST: 'postgres',
            DB_PORT: '5433',
            DB_NAME: 'conecta_amauc',
        });

        expect(Pool).toHaveBeenCalledWith({
            user: 'conecta',
            password: 'senha',
            host: 'postgres',
            port: 5433,
            database: 'conecta_amauc',
            connectionTimeoutMillis: 5000,
        });
    });
});
