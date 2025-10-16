const fs = require('fs');
const path = require('path');
const { log } = require('../services/loggerService');
const { db } = require('../services/databaseService'); 


const { logoutWhatsAppSession } = require('../services/whatsappService');
const { getWaConnectionStatus } = require('../services/whatsappService');


const settingsFilePath = path.join(__dirname, '../../config/settings.json');
const logFilePath = path.join(__dirname, '../../logs/activity.log');

function getSettings() {
    try {
        const settingsData = fs.readFileSync(settingsFilePath, 'utf-8');
        return JSON.parse(settingsData);
    } catch (error) {
        log('ERROR', 'Falha ao ler o arquivo de configurações (settings.json)', { error: error.message });
        // Retorna um objeto padrão para evitar que o app quebre se o arquivo não existir
        return { monitorGroupId: '', targetGroups: [] };
    }
}

// Função para renderizar a página do admin
function renderAdminPage(req, res) {
    const settings = getSettings();
    const success = req.query.success === 'true';
    res.render('admin', { settings, success });
}

// Função para salvar as novas configurações
function saveSettings(req, res) {
    const { monitorGroupId, targetGroups } = req.body;
    
    const targetGroupsArray = Array.isArray(targetGroups) ? targetGroups : (targetGroups ? [targetGroups] : []);
    
    const newSettings = {
        monitorGroupId: monitorGroupId,
        targetGroups: targetGroupsArray.filter(id => id && id.trim() !== '')
    };

    fs.writeFileSync(settingsFilePath, JSON.stringify(newSettings, null, 2));
    log('INFO', 'Configurações atualizadas através do painel.');
    res.redirect('/admin?success=true');
}

// Função para os logs
function renderLogsPage(req, res) {
    try {
        if (fs.existsSync(logFilePath)) {
            const logData = fs.readFileSync(logFilePath, 'utf-8');
            const logs = logData.split('\n')
                                .filter(line => line)
                                .map(line => JSON.parse(line))
                                .reverse();
            res.render('logs', { logs });
        } else {
            res.render('logs', { logs: [] });
        }
    } catch (error) {
        console.error("Erro ao ler arquivo de log:", error);
        log('ERROR', 'Falha ao carregar e parsear o arquivo de log.', { error: error.message });
        res.render('logs', { logs: [{ timestamp: new Date(), level: 'ERROR', message: 'Falha ao carregar logs.' }] });
    }
}

function renderInboxPage(req, res) {
    const query = "SELECT * FROM messages ORDER BY timestamp DESC LIMIT 50";
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error("Erro ao buscar mensagens:", err);
            res.render('inbox', { messages: [] });
            return;
        }
        res.render('inbox', { messages: rows });
    });
}


function renderWhatsappPage(req, res) {
    const initialStatus = getWaConnectionStatus();
    res.render('whatsapp', { initialStatus });
}

async function logoutWhatsapp(req, res) {
    try {
        const result = await logoutWhatsAppSession();
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = { renderAdminPage, saveSettings, renderLogsPage, renderAdminPage, renderInboxPage, renderWhatsappPage, logoutWhatsapp };
