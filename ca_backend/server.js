const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json()); 


app.get('/api/status', (req, res) => {
    res.json({ mensagem: 'API rodando! ' });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});