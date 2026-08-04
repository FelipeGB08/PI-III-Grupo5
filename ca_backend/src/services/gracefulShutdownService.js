function criarEncerramentoGracioso({
    server,
    io,
    pool,
    logger,
    exit = (code) => process.exit(code),
    timeoutMs = 10_000,
}) {
    let encerrando = false;

    return function encerrar(sinal) {
        if (encerrando) return;
        encerrando = true;
        logger.info('Encerramento gracioso iniciado.', { sinal });

        const limite = setTimeout(() => {
            logger.error('Tempo limite excedido durante encerramento gracioso.', { sinal });
            exit(1);
        }, timeoutMs);
        limite.unref?.();

        io.close(() => {
            const finalizar = async (erro = null) => {
                if (erro) logger.error('Falha ao fechar servidor HTTP.', { erro });
                await pool.end();
                clearTimeout(limite);
                exit(erro ? 1 : 0);
            };

            if (server.listening) {
                server.close(finalizar);
            } else {
                finalizar();
            }
        });
    };
}

module.exports = {
    criarEncerramentoGracioso,
};
