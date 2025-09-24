const { sendMessage } = require('../services/whatsappService');
const fs = require('fs');
const path = require('path');
const { log } = require('../services/loggerService');
// Caminho para o arquivo de configurações
const settingsFilePath = path.join(__dirname, '../../config/settings.json');

// Função para ler as configurações
function getSettings() {
    const settingsData = fs.readFileSync(settingsFilePath);
    return JSON.parse(settingsData);
}

async function handleSendMessage(req, res) {
    // Agora, pegamos apenas a legenda e a imagem do n8n
    const { caption, imageBase64 } = req.body;

    // E lemos os grupos de destino diretamente do nosso arquivo de configuração
    const settings = getSettings();
    const targetGroups = settings.targetGroups;

    // A validação agora checa se existem grupos de destino configurados
    if (!targetGroups || !Array.isArray(targetGroups) || targetGroups.length === 0 || !caption) {
        return res.status(400).json({ error: 'Parâmetros "caption" é obrigatório e precisa haver ao menos um "targetGroup" no arquivo settings.json.' });
    }

    try {
        // Enviamos os dados para o serviço
        log('INFO', 'Requisição recebida do n8n para enviar mensagem.');
        const result = await sendMessage(targetGroups, caption, imageBase64);
        res.status(200).json(result);
    } catch (error) {
        log('ERROR', 'Erro no controlador de mensagem', { error: error.message });
        res.status(500).json({ error: error.message });
    }
}

module.exports = { handleSendMessage };