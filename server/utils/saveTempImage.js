const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const TMP_DIR = path.join(app.getPath("userData"), "print-tmp");

function ensureTmpDir() {
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }
}

function saveBufferAsImage(buffer, prefix = "img") {
  ensureTmpDir();

  const filePath = path.join(
    TMP_DIR,
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.png`
  );

  fs.writeFileSync(filePath, buffer);
  return filePath;
}

module.exports = { saveBufferAsImage };
