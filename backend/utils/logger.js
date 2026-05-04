// backend/utils/logger.js - Error Logging System

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, `app-${new Date().toISOString().slice(0, 10)}.log`);

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const log = (level, message, error = null) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    error: error ? { message: error.message, stack: error.stack } : null
  };

  const logString = JSON.stringify(logEntry) + '\n';
  
  fs.appendFileSync(LOG_FILE, logString);
  console.log(`[${timestamp}] [${level}] ${message}`);
  
  if (error) {
    console.error(error);
  }
};

module.exports = {
  info: (message) => log('INFO', message),
  warn: (message) => log('WARN', message),
  error: (message, error) => log('ERROR', message, error),
  debug: (message) => log('DEBUG', message)
};
