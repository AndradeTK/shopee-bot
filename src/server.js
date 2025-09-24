// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

const app = require('./app');
const { connectToWhatsApp } = require('./services/whatsappService');

const PORT = process.env.PORT || 3000;

// Inicia a conexão com o WhatsApp
connectToWhatsApp().catch(err => console.log("Erro inesperado ao conectar ao WhatsApp: ", err));

// Inicia o servidor Express
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});