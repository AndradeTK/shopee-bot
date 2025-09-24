const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, '../../logs/activity.log');

function log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level, // INFO, ERROR
        message,
        ...data
    };

    fs.appendFileSync(logFilePath, JSON.stringify(logEntry) + '\n');
}

module.exports = { log };