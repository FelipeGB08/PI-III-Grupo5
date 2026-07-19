const Sentry = require('@sentry/node');

const dsn = String(process.env.SENTRY_DSN || '').trim();
const sentryAtivo = Boolean(dsn);

if (sentryAtivo) {
    Sentry.init({
        dsn,
        environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
        sendDefaultPii: false,
    });
}

module.exports = {
    Sentry,
    sentryAtivo,
};
