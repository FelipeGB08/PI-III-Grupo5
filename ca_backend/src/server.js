require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
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

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', userRoutes);
app.use('/api/perfil', perfilRoutes);
app.use('/api/servicos', servicoRoutes);
app.use('/api/solicitacoes', solicitacaoRoutes);
app.use('/api/avaliacoes', avaliacaoRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/admin', adminCategoriaRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin/relatorios', relatorioRoutes);
app.use('/api/profissionais', profissionalRoutes);
app.use('/api/agenda', agendaRoutes);

app.get('/api/status', (req, res) => {
    res.json({ mensagem: 'API do Conecta Amauc rodando !' });
});

app.use((req, res, next) => {
    res.status(404).json({ erro: 'Endpoint não encontrado na API.' });
});

app.use((err, req, res, next) => {
    console.error(' Erro Crítico Capturado pelo Escudo:', err.stack);
    res.status(500).json({
        erro: 'Ocorreu um erro interno inesperado no servidor.',
        detalhe: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
