require('dotenv').config();
const { sentryAtivo } = require('./config/sentry');
const logger = require('./utils/logger');
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { Server } = require('socket.io');
const { avisarCredenciaisSociaisAusentes } = require('./config/socialAuthConfig');

avisarCredenciaisSociaisAusentes();
require('./config/db');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const perfilRoutes = require('./routes/perfilRoutes');
const servicoRoutes = require('./routes/servicoRoutes');
const solicitacaoRoutes = require('./routes/solicitacaoRoutes');
const avaliacaoRoutes = require('./routes/avaliacaoRoutes');
const categoriaRoutes = require('./routes/categoriaRoutes');
const adminCategoriaRoutes = require('./routes/adminCategoriaRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const relatorioRoutes = require('./routes/relatorioRoutes');
const profissionalRoutes = require('./routes/profissionalRoutes');
const agendaRoutes = require('./routes/agendaRoutes');
const dispositivoRoutes = require('./routes/dispositivoRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const favoritoRoutes = require('./routes/favoritoRoutes');
const { initChatSocket } = require('./services/chatSocketService');

const configuredOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const corsOrigin = configuredOrigins.length > 0
    ? configuredOrigins
    : (process.env.NODE_ENV === 'production' ? [] : '*');
const API_PREFIX_V1 = '/api/v1';
const API_PREFIX_LEGADO = '/api';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: corsOrigin,
        methods: ['GET', 'POST'],
    },
});

initChatSocket(io);

const apiDocsEnabled = process.env.ENABLE_API_DOCS === 'true' || (
    process.env.ENABLE_API_DOCS !== 'false' &&
    process.env.NODE_ENV !== 'production'
);

if (apiDocsEnabled) {
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
    helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }),
    express.static(path.resolve(__dirname, '..', 'uploads')),
);

const rotasApi = [
    ['/auth', authRoutes],
    ['/usuarios', userRoutes],
    ['/perfil', perfilRoutes],
    ['/servicos', servicoRoutes],
    ['/solicitacoes', solicitacaoRoutes],
    ['/avaliacoes', avaliacaoRoutes],
    ['/categorias', categoriaRoutes],
    ['/admin', adminCategoriaRoutes],
    ['/upload', uploadRoutes],
    ['/admin/relatorios', relatorioRoutes],
    ['/profissionais', profissionalRoutes],
    ['/agenda', agendaRoutes],
    ['/dispositivos', dispositivoRoutes],
    ['/notificacoes', notificationRoutes],
    ['/favoritos', favoritoRoutes],
];

function registrarRotasApi(prefixo) {
    for (const [caminho, router] of rotasApi) {
        app.use(`${prefixo}${caminho}`, router);
    }
}

registrarRotasApi(API_PREFIX_V1);
registrarRotasApi(API_PREFIX_LEGADO);

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
 *               mensagem: API do Conecta Amauc rodando !
 *       '500':
 *         $ref: '#/components/responses/InternalError'
 */
function responderStatus(req, res) {
    res.json({ mensagem: 'API do Conecta Amauc rodando !' });
}

app.get(`${API_PREFIX_V1}/status`, responderStatus);
app.get(`${API_PREFIX_LEGADO}/status`, responderStatus);

app.use((req, res, next) => {
    res.status(404).json({ erro: 'Endpoint não encontrado na API.' });
});

app.use((err, req, res, next) => {
    if (
        err.name === 'MulterError' ||
        err.message?.includes('Tipo de arquivo nao permitido')
    ) {
        return res.status(400).json({
            erro: err.code === 'LIMIT_FILE_SIZE'
                ? 'Imagem muito grande. Envie arquivos de ate 5MB.'
                : err.message,
        });
    }

    logger.error('Erro nao tratado pela API.', {
        erro: err,
        metodo: req.method,
        rota: req.path,
        usuarioId: req.usuarioLogado?.id,
    });
    res.status(500).json({
        erro: 'Ocorreu um erro interno inesperado no servidor.',
        detalhe: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    logger.info('Servidor iniciado.', {
        porta: PORT,
        sentryAtivo,
        ambiente: process.env.NODE_ENV || 'development',
    });
});
