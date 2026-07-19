const FONTES_VALIDAS = new Set(['body', 'params', 'query']);

function mensagemEmPortugues(issue) {
    const mensagem = String(issue?.message || '');
    if (mensagem && !/^Invalid input|^Too (small|big)/i.test(mensagem)) {
        return mensagem;
    }

    const campo = issue?.path?.length > 0 ? issue.path.join('.') : null;
    return campo
        ? `O campo ${campo} e invalido.`
        : 'Dados enviados sao invalidos.';
}

function validate(schema, fonte = 'body') {
    if (!schema || typeof schema.safeParse !== 'function') {
        throw new TypeError('Um schema Zod valido deve ser informado.');
    }

    if (!FONTES_VALIDAS.has(fonte)) {
        throw new TypeError('A fonte de validacao deve ser body, params ou query.');
    }

    return (req, res, next) => {
        const resultado = schema.safeParse(req[fonte] || {});

        if (!resultado.success) {
            const primeiraFalha = resultado.error.issues[0];
            return res.status(400).json({
                erro: mensagemEmPortugues(primeiraFalha),
            });
        }

        if (fonte !== 'query') {
            req[fonte] = resultado.data;
        }

        req.validated = {
            ...(req.validated || {}),
            [fonte]: resultado.data,
        };

        return next();
    };
}

module.exports = validate;
