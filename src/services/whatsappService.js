const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage,
} = require("@whiskeysockets/baileys");
const { exec } = require('child_process');
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { Boom } = require("@hapi/boom");
const { log } = require("./loggerService");
const { insertMessage } = require("./databaseService");

let sock;
let connectionStatus = 'Iniciando...'; // Variável para rastrear o status da conexão em tempo real
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

// Carrega as configurações do arquivo JSON
const settingsFilePath = path.join(__dirname, "../../config/settings.json");
let settings = JSON.parse(fs.readFileSync(settingsFilePath));
let MONITOR_GROUP_ID = settings.monitorGroupId;

// Função para recarregar as configurações sem precisar reiniciar todo o processo
function reloadSettings() {
    settings = JSON.parse(fs.readFileSync(settingsFilePath));
    MONITOR_GROUP_ID = settings.monitorGroupId;
    console.log('Configurações de grupo recarregadas.');
    log('INFO', 'Configurações de grupo recarregadas a partir do painel.');
}

async function connectToWhatsApp(io) {
  const { state, saveCreds } = await useMultiFileAuthState("session");

  sock = makeWASocket({
    auth: state,
    logger: pino({ level: "trace" }),
  });

  // Listener para o status da conexão
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Atualiza a variável de status e emite para o painel
    if (qr) {
      connectionStatus = 'Aguardando QR Code';
      console.log("QR Code gerado. Enviando para o painel...");
      io.emit('qr', qr);
      io.emit('status', connectionStatus);
    }

    if (connection === "close") {
      connectionStatus = 'Desconectado';
      const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("Conexão fechada, reconectando:", shouldReconnect);
      io.emit('status', connectionStatus);
      if (shouldReconnect) {
        connectToWhatsApp(io);
      }
    } else if (connection === "open") {
      connectionStatus = 'Conectado';
      console.log("Conexão com o WhatsApp aberta!");
      io.emit('status', connectionStatus);
      io.emit('qr', null); // Limpa o QR Code da tela
    } else if (connection === "connecting") {
      connectionStatus = 'Conectando...';
      console.log("Conectando ao WhatsApp...");
      io.emit('status', connectionStatus);
    }
  });

  // Listener para novas mensagens
  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0];
    if (!msg.message || !msg.key.remoteJid) return;

    const remoteJid = msg.key.remoteJid;

    // Ignora conversas privadas, foca apenas em grupos
    if (!remoteJid.endsWith("@g.us")) return;

    // Extrai o conteúdo da mensagem (legenda ou texto)
    const messageText =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption;

    if (!messageText) return;

    console.log("Mensagem recebida de:", remoteJid);

    // Salva a mensagem no banco de dados para a "Caixa de Entrada" do painel
    try {
      const senderName = msg.pushName || "Desconhecido";
      const metadata = await sock.groupMetadata(remoteJid);
      const groupName = metadata.subject;
      insertMessage({
        groupId: remoteJid,
        groupName,
        senderName,
        messageText,
      });
    } catch (e) {
      log("ERROR", "Falha ao salvar mensagem no banco de dados", { error: e.message });
      console.error(
        "Erro ao obter metadados ou salvar mensagem no banco de dados:",
        e.message
      );
    }

    // Verifica se a mensagem é do grupo de origem que deve ser processado
    if (remoteJid === MONITOR_GROUP_ID) {
      log("INFO", `Mensagem recebida do grupo monitorado ${remoteJid}`);
      let imageBase64 = null;

      // Se for uma imagem, tenta baixar a mídia
      if (msg.message.imageMessage) {
        console.log("Detectada imagem. Baixando mídia...");
        try {
          const buffer = await downloadMediaMessage(msg, "buffer", {});
          imageBase64 = buffer.toString("base64");
          console.log("Mídia baixada com sucesso.");
        } catch (e) {
          log('ERROR', 'Falha ao baixar mídia', { error: e.message });
          console.error("Erro ao baixar mídia:", e);
        }
      }

      // Envia os dados para o n8n para processamento
      try {
        await axios.post(N8N_WEBHOOK_URL, {
          caption: messageText,
          imageBase64: imageBase64,
          from: remoteJid,
        });
        console.log("Dados enviados para o n8n com sucesso!");
      } catch (error) {
        log('ERROR', 'Falha ao enviar dados para o n8n', { error: error.message });
        console.error("Erro ao enviar dados para o n8n:", error.message);
      }
    }
  });

  // Listener para salvar as credenciais da sessão
  sock.ev.on("creds.update", saveCreds);
}

// Função para enviar mensagens para os grupos de destino
async function sendMessage(targetGroups, caption, imageBase64) {
  if (!sock || connectionStatus !== 'Conectado') {
    throw new Error("WhatsApp não está conectado.");
  }
  try {
    for (const groupId of targetGroups) {
      if (imageBase64) {
        const imageBuffer = Buffer.from(imageBase64, "base64");
        await sock.sendMessage(groupId, {
          image: imageBuffer,
          caption: caption,
        });
      } else {
        await sock.sendMessage(groupId, { text: caption });
      }
      log("INFO", `Mensagem reenviada para o grupo de destino ${groupId}`);
      console.log(`Mensagem enviada para o grupo ${groupId}`);
    }
    return { status: "success", message: "Mensagens enviadas com sucesso." };
  } catch (error) {
    log("ERROR", "Falha ao enviar mensagem via WhatsApp", { error: error.message });
    console.error("Erro ao enviar mensagem:", error);
    throw new Error("Falha ao enviar mensagem via WhatsApp.");
  }
}

// Função para encerrar a sessão e forçar um novo QR Code
async function logoutWhatsAppSession() {
    console.log('Iniciando processo de logout do WhatsApp...');
    connectionStatus = 'Desconectando...';
    try {
        if (sock) {
            await sock.logout();
            console.log('Sessão do WhatsApp encerrada.');
        }
        
        const sessionPath = path.join(__dirname, '../../session');
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
        }
        fs.mkdirSync(sessionPath);
        console.log('Pasta de sessão limpa e recriada.');
        
        console.log('Reiniciando o bot via PM2...');
        // Dá um pequeno tempo para a resposta HTTP ser enviada antes de reiniciar
        setTimeout(() => {
            exec('pm2 restart shopee-bot', (error) => {
                if (error) {
                    console.error(`Erro ao reiniciar com PM2: ${error.message}`);
                }
            });
        }, 1000);

        return { success: true, message: 'Bot reiniciando para gerar novo QR Code.' };
    } catch (error) {
        console.error('Erro durante o processo de logout:', error);
        throw new Error('Falha ao encerrar a sessão do WhatsApp.');
    }
}

// Função para obter o status atual da conexão para o painel
function getWaConnectionStatus() {
    return connectionStatus;
}


module.exports = { connectToWhatsApp, sendMessage, logoutWhatsAppSession, getWaConnectionStatus, reloadSettings };
