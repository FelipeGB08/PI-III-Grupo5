module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    clearMocks: true,
    collectCoverage: true,
    collectCoverageFrom: [
        'src/controllers/**/*.js',
        'src/services/**/*.js',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov'],
    coverageThreshold: {
        global: {
            branches: 50,
            functions: 50,
            lines: 50,
            statements: 50,
        },
        'src/controllers/**/*.js': {
            branches: 50,
            functions: 50,
            lines: 50,
            statements: 50,
        },
        'src/services/**/*.js': {
            branches: 50,
            functions: 50,
            lines: 50,
            statements: 50,
        },
        'src/services/agendamentoValidator.js': {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
        },
    },
};
