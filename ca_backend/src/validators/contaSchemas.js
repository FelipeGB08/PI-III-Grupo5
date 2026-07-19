const { z } = require('zod');

const excluirContaSchema = z.object({
    confirmacao: z.literal('EXCLUIR MINHA CONTA', {
        error: 'Para excluir a conta, digite EXCLUIR MINHA CONTA.',
    }),
});

module.exports = {
    excluirContaSchema,
};
