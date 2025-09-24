const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

// Rota para o n8n chamar quando precisar enviar uma mensagem
router.post('/send-message', messageController.handleSendMessage);

module.exports = router;