const path = require('path');
const { spawnSync } = require('child_process');
const {
    JWT_SECRET_MIN_LENGTH,
    errosDaConfiguracaoDeProducao,
    validarConfiguracaoDeProducao,
} = require('../../src/config/environment');

function ambienteProducaoValido(sobrescritas = {}) {
    return {
        NODE_ENV: 'production',
        JWT_SECRET: 'segredo-de-producao-com-mais-de-trinta-e-dois-caracteres',
        DATABASE_URL: 'postgresql://usuario:senha@db.exemplo.com:5432/conecta_amauc',
        ALLOWED_ORIGINS: 'https://app.exemplo.com',
        ...sobrescritas,
    };
}

describe('configuração obrigatória de produção', () => {
    test('não aplica bloqueios fora de produção', () => {
        expect(errosDaConfiguracaoDeProducao({ NODE_ENV: 'development' })).toEqual([]);
    });

    test.each([
        ['', 'vazio'],
        ['troque_por_uma_chave_grande', 'placeholder'],
        ['curto-demais', 'curto'],
        ['a'.repeat(JWT_SECRET_MIN_LENGTH), 'repetitivo'],
    ])('rejeita JWT_SECRET %s em produção', (jwtSecret) => {
        const env = ambienteProducaoValido({ JWT_SECRET: jwtSecret });

        expect(() => validarConfiguracaoDeProducao(env)).toThrow(/JWT_SECRET/);
    });

    test('exige configuração válida do PostgreSQL e origens conhecidas', () => {
        const erros = errosDaConfiguracaoDeProducao(ambienteProducaoValido({
            DATABASE_URL: '',
            DB_HOST: '',
            DB_USER: '',
            DB_PASSWORD: '',
            DB_NAME: '',
            ALLOWED_ORIGINS: '*',
        }));

        expect(erros.join(' ')).toContain('DATABASE_URL');
        expect(erros.join(' ')).toContain('ALLOWED_ORIGINS');
    });

    test('aceita as variáveis DB_* como alternativa ao DATABASE_URL', () => {
        const env = ambienteProducaoValido({
            DATABASE_URL: '',
            DB_HOST: 'postgres.interno',
            DB_USER: 'conecta',
            DB_PASSWORD: 'senha-forte',
            DB_NAME: 'conecta_amauc',
        });

        expect(() => validarConfiguracaoDeProducao(env)).not.toThrow();
    });

    test.each([
        'postgres://',
        'postgresql://servidor-sem-banco/',
        'https://usuario:senha@db.exemplo.com/conecta_amauc',
        'nao-e-uma-url',
    ])('rejeita DATABASE_URL estruturalmente invalida: %s', (databaseUrl) => {
        const erros = errosDaConfiguracaoDeProducao(
            ambienteProducaoValido({ DATABASE_URL: databaseUrl })
        );

        expect(erros).toEqual(expect.arrayContaining([
            expect.stringContaining('DATABASE_URL'),
        ]));
    });

    test('aceita DATABASE_URL PostgreSQL com host e nome do banco', () => {
        const env = ambienteProducaoValido({
            DATABASE_URL: 'postgres://usuario:senha@db.exemplo.com:5432/conecta_amauc',
        });

        expect(errosDaConfiguracaoDeProducao(env)).toEqual([]);
    });

    test('o processo do servidor encerra antes do boot com JWT_SECRET fraco', () => {
        const resultado = spawnSync(process.execPath, ['src/server.js'], {
            cwd: path.resolve(__dirname, '../..'),
            encoding: 'utf8',
            env: {
                ...process.env,
                NODE_ENV: 'production',
                JWT_SECRET: 'segredo-curto',
                DATABASE_URL: 'postgresql://usuario:senha@db.exemplo.com:5432/conecta_amauc',
                ALLOWED_ORIGINS: 'https://app.exemplo.com',
            },
        });

        expect(resultado.status).toBe(1);
        expect(resultado.stderr).toContain('[CONFIG][FATAL]');
        expect(resultado.stderr).toContain('JWT_SECRET');
    });
});
