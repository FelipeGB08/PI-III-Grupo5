require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path'); 
require('./config/db');

// Importa todas as rotas
const userRoutes = require('./routes/userRoutes'); 
const perfilRoutes = require('./routes/perfilRoutes');
const solicitacaoRoutes = require('./routes/solicitacaoRoutes');
const avaliacaoRoutes = require('./routes/avaliacaoRoutes');
const categoriaRoutes = require('./routes/categoriaRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const relatorioRoutes = require('./routes/relatorioRoutes');
const profissionalRoutes = require('./routes/profissionalRoutes');

const app = express();

// Configuração explícita do CORS (Segurança contra acessos de origens não autorizadas)
app.use(cors({
    origin: '*', // Em produção real, você pode substituir o '*' pelos IPs permitidos
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Protege a memória RAM do servidor contra envios de JSON gigantescos (limite de 10mb)
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// CONFIGURAÇÃO DE UPLOAD: 
// Torna a pasta 'uploads' pública para que o aplicativo consiga carregar as fotos na tela
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

// Pluga as rotas na API
app.use('/api/usuarios', userRoutes);
app.use('/api/perfil', perfilRoutes);
app.use('/api/solicitacoes', solicitacaoRoutes);
app.use('/api/avaliacoes', avaliacaoRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/upload', uploadRoutes); 
app.use('/api/admin/relatorios', relatorioRoutes);
app.use('/api/profissionais', profissionalRoutes);

// Rota de teste e healthcheck
app.get('/api/status', (req, res) => {
    res.json({ mensagem: 'API do Conecta Amauc rodando !' });
});

// 1. Tratamento para rotas que não existem (Evita crashar o frontend tentando ler HTML)
app.use((req, res, next) => {
    res.status(404).json({ erro: 'Endpoint não encontrado na API.' });
});
// 2. Middleware Global de Erros (Impede que o Node.js "morra" se der um erro fatal)
app.use((err, req, res, next) => {
    console.error(' Erro Crítico Capturado pelo Escudo:', err.stack);
    res.status(500).json({ 
        erro: 'Ocorreu um erro interno inesperado no servidor.',
        detalhe: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Usa a porta do arquivo .env ou a porta 3000 como backup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});