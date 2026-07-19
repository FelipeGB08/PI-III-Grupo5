const { z } = require('zod');

const validate = require('../../src/middlewares/validateMiddleware');
const { loginSchema } = require('../../src/validators/authSchemas');
const { criarRespostaMock } = require('../helpers/httpMocks');

describe('validateMiddleware', () => {
    test('retorna 400 com mensagem clara e nao chama o controller', () => {
        const req = {
            body: { email: 'email-invalido', senha: 'segredo' },
        };
        const res = criarRespostaMock();
        const next = jest.fn();

        validate(loginSchema)(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            erro: 'Informe um e-mail valido.',
        });
        expect(next).not.toHaveBeenCalled();
    });

    test('disponibiliza os dados validados e chama o proximo middleware', () => {
        const req = {
            body: { email: ' pessoa@exemplo.com ', senha: 'segredo' },
        };
        const res = criarRespostaMock();
        const next = jest.fn();

        validate(loginSchema)(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.validated.body).toEqual({
            email: 'pessoa@exemplo.com',
            senha: 'segredo',
        });
        expect(req.body.email).toBe('pessoa@exemplo.com');
    });

    test('tambem valida query e params quando solicitado', () => {
        const querySchema = z.object({
            pagina: z.coerce.number().int().positive('Pagina invalida.'),
        });
        const req = { query: { pagina: '0' }, params: {} };
        const res = criarRespostaMock();
        const next = jest.fn();

        validate(querySchema, 'query')(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ erro: 'Pagina invalida.' });
        expect(next).not.toHaveBeenCalled();
    });
});
