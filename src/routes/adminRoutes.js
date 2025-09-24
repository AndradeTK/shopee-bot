const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Redireciona a raiz para a página de admin
router.get('/', (req, res) => res.redirect('/admin'));

// Rota para exibir a página de configuração
router.get('/admin', adminController.renderAdminPage);

// Rota para salvar as configurações
router.post('/admin/save', adminController.saveSettings);

// Rota para exibir a página de logs
router.get('/admin/logs', adminController.renderLogsPage);

// Rota para a caixa de entrada
router.get('/admin/inbox', adminController.renderInboxPage);

module.exports = router;