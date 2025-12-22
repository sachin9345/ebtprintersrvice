const { app } = require("electron");
const path = require("path");
const fs = require("fs");

function getDataDir() {
  const dir = app.getPath("userData"); // ✅ writable
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getDataFile(fileName) {
  const fullPath = path.join(getDataDir(), fileName);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  return fullPath;
}

module.exports = { getDataDir, getDataFile };
