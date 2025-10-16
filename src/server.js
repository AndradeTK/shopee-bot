// src/server.js (VERSÃO ATUALIZADA)
require('dotenv').config();
const http = require('http'); // Importa o módulo http
const { Server } = require("socket.io"); // Importa o Server do socket.io

const app = require('./app');
const { connectToWhatsApp } = require('./services/whatsappService');

const PORT = process.env.PORT || 3000;

// Cria um servidor http a partir do nosso app Express
const server = http.createServer(app);

// Inicia o socket.io no servidor http
const io = new Server(server);

// Monitora conexões de clientes (navegadores)

io.on('connection', (socket) => {
    console.log('Um cliente se conectou ao painel via WebSocket.');

    // Adiciona um listener para receber erros do frontend
    socket.on('frontend_error', (error) => {
        console.error('--- ERRO RECEBIDO DO NAVEGADOR ---');
        console.error('MENSAGEM:', error.message);
        console.error('LOCAL:', error.context);
        console.error('STACK:', error.stack);
        console.error('------------------------------------');
    });
});

// Inicia a conexão com o WhatsApp, passando o 'io' para ele poder emitir eventos
connectToWhatsApp(io).catch(err => console.log("Erro inesperado ao conectar ao WhatsApp: ", err));

// Inicia o servidor Express (e o socket.io junto)
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
