// No início do arquivo
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const { Boom } = require('@hapi/boom');
const fs = require('fs'); 
const path = require('path'); 
const { log } = require('./loggerService');
// Guarda a instância da conexão do socket
let sock;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

const settingsFilePath = path.join(__dirname, '../../config/settings.json');
const settings = JSON.parse(fs.readFileSync(settingsFilePath));
const MONITOR_GROUP_ID = settings.monitorGroupId;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('session');

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log("QR Code recebido, escaneie com seu celular.");
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Conexão fechada devido a ', lastDisconnect.error, ', reconectando...', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('Conexão com o WhatsApp aberta!');
        }
    });

    // Substitua o seu bloco 'messages.upsert' por este

sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];

    if (!msg.message) return;

    const remoteJid = msg.key.remoteJid;
    console.log('Mensagem recebida de:', remoteJid);

    // Só processa mensagens do grupo monitorado
    if (remoteJid === MONITOR_GROUP_ID) {
        const messageType = Object.keys(msg.message)[0];
        let caption = '';
        let imageBase64 = null;

        // Verifica se a mensagem é uma imagem com legenda
        if (messageType === 'imageMessage' && msg.message.imageMessage.caption) {
            caption = msg.message.imageMessage.caption;

            console.log('Detectada imagem com legenda. Baixando mídia...');
            try {
                // Baixa a imagem e a converte para Base64
                const buffer = await downloadMediaMessage(msg, 'buffer', {});
                imageBase64 = buffer.toString('base64');
                console.log('Mídia baixada com sucesso.');
            } catch (e) {
                console.error('Erro ao baixar mídia:', e);
            }
        } else {
            // Se não for imagem com legenda, pega apenas o texto (como antes)
            caption = msg.message.conversation || msg.message.extendedTextMessage?.text;
        }

        // Se tivermos uma legenda para processar, envia para o n8n
        if (caption) {
            log('INFO', `Mensagem recebida do grupo ${caption}`);
            console.log(`Legenda/Texto do grupo monitorado: "${caption}"`);
            try {
                await axios.post(N8N_WEBHOOK_URL, {
                    caption: caption, // Enviamos a legenda/texto
                    imageBase64: imageBase64, // Enviamos a imagem (ou null se não tiver)
                    from: remoteJid
                });
                console.log('Dados enviados para o n8n com sucesso!');
            } catch (error) {
                console.error('Erro ao enviar dados para o n8n:', error.message);
            }
        }
    }
});

    sock.ev.on('creds.update', saveCreds);
}


async function sendMessage(targetGroups, caption, imageBase64) {
    if (!sock) {
        throw new Error('WhatsApp não está conectado.');
    }
    try {
        for (const groupId of targetGroups) {
            if (imageBase64) {
        
                const imageBuffer = Buffer.from(imageBase64, 'base64');
                await sock.sendMessage(groupId, { 
                    image: imageBuffer, 
                    caption: caption 
                });
            } else {
              
                await sock.sendMessage(groupId, { text: caption });
            }
            log('INFO', `Mensagem reenviada para o grupo de destino ${groupId}`);
            console.log(`Mensagem enviada para o grupo ${groupId}`);
        }
        return { status: 'success', message: 'Mensagens enviadas com sucesso.' };
    } catch (error) {
        log('ERROR', 'Falha ao processar mensagem/mídia', { error: e.message });
        console.error('Erro ao enviar mensagem:', error);
        throw new Error('Falha ao enviar mensagem via WhatsApp.');
    }
}

module.exports = { connectToWhatsApp, sendMessage };