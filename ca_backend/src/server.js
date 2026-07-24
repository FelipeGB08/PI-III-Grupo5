require('dotenv').config();
const { validarConfiguracaoDeProducao } = require('./config/environment');

try {
    validarConfiguracaoDeProducao();
} catch (erro) {
    console.error(`[CONFIG][FATAL] ${erro.message}`);
    process.exit(1);
}

const { sentryAtivo } = require('./config/sentry');
const logger = require('./utils/logger');
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const { avisarCredenciaisSociaisAusentes } = require('./config/socialAuthConfig');
const { pastaUploads } = require('./config/uploads');
const { apiDocsEnabled } = require('./config/apiDocs');
const {
    API_PREFIX_V1,
    API_PREFIX_LEGADO,
    registrarRotasApi,
} = require('./config/apiRoutes');
const errorHandler = require('./middlewares/errorHandler');
const { criarProtecaoDeUpload } = require('./middlewares/uploadAccessMiddleware');
const { criarHealthController } = require('./controllers/HealthController');

avisarCredenciaisSociaisAusentes();
const pool = require('./config/db');

const { initChatSocket } = require('./services/chatSocketService');

const configuredOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const corsOrigin = configuredOrigins.length > 0
    ? configuredOrigins
    : (process.env.NODE_ENV === 'production' ? [] : '*');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: corsOrigin,
        methods: ['GET', 'POST'],
    },
});

initChatSocket(io);

if (apiDocsEnabled()) {
    const swaggerUi = require('swagger-ui-express');
    const swaggerSpec = require('./config/swagger');
    const swaggerUiOptions = {
        customSiteTitle: 'Conecta AMAUC API',
    };

    app.use(`${API_PREFIX_V1}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
    app.use(`${API_PREFIX_LEGADO}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
}

app.use(helmet());

app.use(cors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Limit', 'X-Total-Pages'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(
    '/uploads',
    (req, res, next) => {
        if (!/\.(jpg|png|webp)$/i.test(req.path)) {
            return res.status(404).json({ erro: 'Imagem nao encontrada.' });
        }
        return next();
    },
    criarProtecaoDeUpload(pool),
    helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }),
    express.static(pastaUploads, {
        setHeaders: (res) => {
            if (res.locals.uploadPrivado) {
                res.setHeader('Cache-Control', 'private, no-store');
            }
        },
    }),
);

registrarRotasApi(app, API_PREFIX_V1);
registrarRotasApi(app, API_PREFIX_LEGADO);

/**
 * @swagger
 * /api/status:
 *   get:
 *     tags: [Status]
 *     summary: Verifica se a API está disponível
 *     responses:
 *       '200':
 *         description: API em execução.
 *         content:
 *           application/json:
 *             example:
 *               mensagem: API do Conecta Amauc rodando!
 *               banco: disponivel
 *       '503':
 *         description: PostgreSQL indisponível.
 */
const responderStatus = criarHealthController(pool);

app.get(`${API_PREFIX_V1}/status`, responderStatus);
app.get(`${API_PREFIX_LEGADO}/status`, responderStatus);

app.use((req, res, next) => {
    res.status(404).json({ erro: 'Endpoint não encontrado na API.' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    logger.info('Servidor iniciado.', {
        porta: PORT,
        sentryAtivo,
        ambiente: process.env.NODE_ENV || 'development',
    });
});
