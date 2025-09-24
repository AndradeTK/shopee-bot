const express = require('express');
const apiRoutes = require('./routes/apiRoutes');
const adminRoutes = require('./routes/adminRoutes'); 
const path = require('path');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views')); // Define o caminho para a pasta views
app.use(express.static(path.join(__dirname, '../public'))); // Serve arquivos estáticos (CSS, JS)
app.use(express.urlencoded({ extended: true })); // Permite ler dados de formulários

// Middleware para interpretar o corpo da requisição como JSON
app.use(express.json());

// Anexa as rotas da API ao caminho /api
app.use('/api', apiRoutes);
app.use('/', adminRoutes);

module.exports = app;