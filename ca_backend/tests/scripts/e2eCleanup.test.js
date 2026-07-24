const path = require('path');
const {
    caminhoUploadSeguro,
    criarContextoLimpeza,
    limparResiduosAnterioresE2E,
    limparResiduosE2E,
    registrarUpload,
    registrarUsuario,
    removerArquivosOrfaosE2E,
} = require('../../scripts/e2eCleanup');

describe('e2eCleanup', () => {
    const uploadsDir = path.resolve('tmp', 'uploads-e2e');
    const envLocal = {
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        DB_NAME: 'conecta_amauc_e2e',
        DB_USER: 'postgres',
        DB_PASSWORD: 'senha',
    };

    test('recusa executar E2E contra API ou banco remoto', () => {
        expect(() => criarContextoLimpeza({
            apiBaseUrl: 'https://api.example.com/api/v1', env: envLocal,
        })).toThrow(/locais\/isolados/);
        expect(() => criarContextoLimpeza({
            apiBaseUrl: 'http://localhost:3000/api/v1',
            env: { ...envLocal, DATABASE_URL: 'postgres://db.example.com/app' },
        })).toThrow(/locais\/isolados/);
    });

    test('remove somente usuarios e uploads registrados pelo E2E', async () => {
        const contexto = criarContextoLimpeza({
            apiBaseUrl: 'http://localhost:3000/api/v1', env: envLocal,
        });
        registrarUsuario(contexto, { id: 21 }, 'cidadao.e2e@example.test');
        registrarUpload(contexto, ['/uploads/e2e-image.png', '/uploads/../../fora.txt']);

        const client = {
            connect: jest.fn(),
            end: jest.fn(),
            query: jest.fn()
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({ rows: [{ id: 21 }] })
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({}),
        };
        const unlink = jest.fn().mockResolvedValue();
        const resultado = await limparResiduosE2E(contexto, {
            createClient: () => client,
            unlink,
            uploadsDir,
        });

        expect(client.query).toHaveBeenCalledWith(
            'DELETE FROM usuarios WHERE id = ANY($1::integer[])',
            [[21]]
        );
        expect(unlink).toHaveBeenCalledTimes(1);
        expect(resultado).toEqual({ usuariosRemovidos: 1, arquivosRemovidos: 1 });
    });

    test('aceita apenas nome de arquivo seguro dentro de uploads', () => {
        expect(caminhoUploadSeguro('/uploads/e2e.png', uploadsDir))
            .toBe(path.join(uploadsDir, 'e2e.png'));
        expect(caminhoUploadSeguro('/uploads/../../segredo.txt', uploadsDir))
            .toBeNull();
    });

    test('setup remove somente residuos E2E antigos e seus uploads', async () => {
        const contexto = criarContextoLimpeza({
            apiBaseUrl: 'http://localhost:3000/api/v1', env: envLocal,
        });
        const client = {
            connect: jest.fn(),
            end: jest.fn(),
            query: jest.fn()
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({
                    rows: [{ id: 140 }, { id: 141 }, { id: 142 }],
                })
                .mockResolvedValueOnce({
                    rows: [{
                        foto_url: null,
                        fotos_conclusao: ['/uploads/evidencia-antiga.png'],
                    }],
                })
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({}),
        };
        const unlink = jest.fn().mockResolvedValue();

        const resultado = await limparResiduosAnterioresE2E(contexto, {
            createClient: () => client,
            unlink,
            uploadsDir,
        });

        expect(client.query.mock.calls[1][1]).toEqual([
            '^(cidadao|intruso|profissional)[.]e2e[.][0-9]+@amauc[.]com$',
            'Fluxo E2E:%',
        ]);
        expect(client.query).toHaveBeenCalledWith(
            'DELETE FROM usuarios WHERE id = ANY($1::integer[])',
            [[140, 141, 142]]
        );
        expect(unlink).toHaveBeenCalledWith(
            path.join(uploadsDir, 'evidencia-antiga.png')
        );
        expect(resultado).toEqual({
            usuariosRemovidos: 3,
            arquivosRemovidos: 1,
        });
    });

    test('remove apenas arquivos orfaos com o marcador historico estrito', async () => {
        const unlink = jest.fn().mockResolvedValue();
        const removidos = await removerArquivosOrfaosE2E({
            readdir: jest.fn().mockResolvedValue([
                '314df9a3aca659d730540cfbc38ecc29-evidencia-e2e.jpg',
                'perfil-real.jpg',
                'evidencia-e2e.jpg',
                '314df9a3aca659d730540cfbc38ecc29-evidencia-e2e.jpg.exe',
            ]),
            unlink,
            uploadsDir,
        });

        expect(unlink).toHaveBeenCalledTimes(1);
        expect(unlink).toHaveBeenCalledWith(
            path.join(
                uploadsDir,
                '314df9a3aca659d730540cfbc38ecc29-evidencia-e2e.jpg'
            )
        );
        expect(removidos).toBe(1);
    });
});
