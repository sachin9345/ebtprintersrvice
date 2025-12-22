const { app } = require("electron");
const fs = require("fs");
const path = require("path");

const CONFIG_DIR = app.getPath("userData");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

function ensureConfig() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(
      CONFIG_PATH,
      JSON.stringify(
        {
          printerName: null,
          paperSize: "80MM",
        },
        null,
        2
      )
    );
  }
}

module.exports = {
  CONFIG_PATH,
  ensureConfig,
};
