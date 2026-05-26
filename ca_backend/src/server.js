require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path'); // IMPORTANTE: Necessário para mapear a pasta de fotos
require('./config/db');

// Importa todas as rotas
const userRoutes = require('./routes/userRoutes'); 
const perfilRoutes = require('./routes/perfilRoutes');
const solicitacaoRoutes = require('./routes/solicitacaoRoutes');
const avaliacaoRoutes = require('./routes/avaliacaoRoutes');
const categoriaRoutes = require('./routes/categoriaRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const relatorioRoutes = require('./routes/relatorioRoutes');

const app = express();

app.use(cors());
app.use(express.json());

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

// Rota de teste
app.get('/api/status', (req, res) => {
    res.json({ mensagem: 'API do Conecta AMAUC rodando!' });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});