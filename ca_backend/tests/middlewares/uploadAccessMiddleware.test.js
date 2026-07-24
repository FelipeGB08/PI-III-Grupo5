const {
    criarProtecaoDeUpload,
    tokenBearer,
    urlDoUpload,
} = require('../../src/middlewares/uploadAccessMiddleware');

function resposta() {
    return {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        set: jest.fn(),
    };
}

describe('uploadAccessMiddleware', () => {
    test('normaliza somente URL de imagem plana e extrai Bearer', () => {
        expect(urlDoUpload({ path: '/foto-segura.jpg' }))
            .toBe('/uploads/foto-segura.jpg');
        expect(urlDoUpload({ path: '/../segredo.jpg' })).toBeNull();
        expect(urlDoUpload({ path: '/arquivo.svg' })).toBeNull();
        expect(tokenBearer({
            headers: { authorization: 'Bearer access-token' },
        })).toBe('access-token');
    });

    test('mantem upload nao vinculado publico', async () => {
        const pool = {
            query: jest.fn().mockResolvedValue({ rows: [] }),
        };
        const next = jest.fn();
        const res = resposta();

        await criarProtecaoDeUpload(pool)(
            { path: '/avatar.png', headers: {} },
            res,
            next
        );

        expect(next).toHaveBeenCalledWith();
        expect(res.status).not.toHaveBeenCalled();
    });

    test('exige autenticacao para imagem vinculada a solicitacao', async () => {
        const pool = {
            query: jest.fn().mockResolvedValue({
                rows: [{ cidadao_id: 10, prof_id: 20 }],
            }),
        };
        const next = jest.fn();
        const res = resposta();

        await criarProtecaoDeUpload(pool)(
            { path: '/evidencia.webp', headers: {} },
            res,
            next
        );

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test.each([
        [{ id: 10, perfil_tipo: 'cidadao' }, true],
        [{ id: 20, perfil_tipo: 'profissional' }, true],
        [{ id: 99, perfil_tipo: 'admin' }, true],
        [{ id: 99, perfil_tipo: 'cidadao' }, false],
    ])(
        'autoriza apenas participante ou admin: %j',
        async (usuario, permitido) => {
            const pool = {
                query: jest.fn().mockResolvedValue({
                    rows: [{ cidadao_id: 10, prof_id: 20 }],
                }),
            };
            const validarToken = jest.fn().mockResolvedValue({ usuario });
            const middleware = criarProtecaoDeUpload(pool, { validarToken });
            const next = jest.fn();
            const res = resposta();

            await middleware(
                {
                    path: '/evidencia.webp',
                    headers: { authorization: 'Bearer token-ativo' },
                },
                res,
                next
            );

            if (permitido) {
                expect(next).toHaveBeenCalledWith();
                expect(res.set).toHaveBeenCalledWith(
                    'Cache-Control',
                    'private, no-store'
                );
            } else {
                expect(res.status).toHaveBeenCalledWith(403);
                expect(next).not.toHaveBeenCalled();
            }
        }
    );

    test('token revogado recebe 401 e falha de banco segue ao error handler', async () => {
        const pool = {
            query: jest.fn()
                .mockResolvedValueOnce({
                    rows: [{ cidadao_id: 10, prof_id: 20 }],
                })
                .mockRejectedValueOnce(new Error('banco indisponivel')),
        };
        const erroSessao = Object.assign(new Error('sessao encerrada'), {
            codigo: 'sessao_encerrada',
        });
        const middleware = criarProtecaoDeUpload(pool, {
            validarToken: jest.fn().mockRejectedValue(erroSessao),
        });
        const req = {
            path: '/evidencia.png',
            headers: { authorization: 'Bearer token-revogado' },
        };

        const resRevogado = resposta();
        const nextRevogado = jest.fn();
        await middleware(req, resRevogado, nextRevogado);
        expect(resRevogado.status).toHaveBeenCalledWith(401);

        const resBanco = resposta();
        const nextBanco = jest.fn();
        await middleware(req, resBanco, nextBanco);
        expect(nextBanco).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'banco indisponivel' })
        );
    });
});
