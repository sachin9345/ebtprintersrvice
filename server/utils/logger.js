const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const LOG_DIR = path.join(app.getPath("userData"), "logs");
const LOG_FILE = path.join(LOG_DIR, "printer.log");

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, line);
}

function logError(err) {
  log(`ERROR: ${err.stack || err.message || err}`);
}

module.exports = { log, logError, LOG_FILE };
