const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        createTable();
    }
});

// Cria a tabela de mensagens se ela não existir
function createTable() {
    const createTableSql = `
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        groupId TEXT NOT NULL,
        groupName TEXT,
        senderName TEXT,
        messageText TEXT
    );`;
    db.run(createTableSql, (err) => {
        if (err) {
            console.error('Erro ao criar tabela de mensagens', err.message);
        }
    });
}

// Função para inserir uma nova mensagem no banco
function insertMessage({ groupId, groupName, senderName, messageText }) {
    const insertSql = `INSERT INTO messages (groupId, groupName, senderName, messageText) VALUES (?, ?, ?, ?)`;
    db.run(insertSql, [groupId, groupName, senderName, messageText], function(err) {
        if (err) {
            return console.error('Erro ao inserir mensagem', err.message);
        }
        console.log(`Mensagem salva no banco com o ID: ${this.lastID}`);
    });
}

module.exports = { db, insertMessage };