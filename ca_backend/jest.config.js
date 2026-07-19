module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    clearMocks: true,
    collectCoverage: true,
    collectCoverageFrom: [
        'src/services/agendamentoValidator.js',
        'src/controllers/AgendaController.js',
        'src/controllers/SolicitacaoController.js',
        'src/controllers/AvaliacaoController.js',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov'],
    coverageThreshold: {
        'src/services/agendamentoValidator.js': {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
        },
    },
};
