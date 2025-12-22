const { Tray, Menu, shell, app } = require("electron");
const path = require("path");
const axios = require("axios");

let tray = null;


function getTrayIconPath() {
  if (app.isPackaged) {
    return path.join(
      process.resourcesPath,
      "app.asar.unpacked",
      "electron",
      "assets",
      "print.ico"
    );
  }
    return path.join(__dirname, "assets", "print.ico");
}

function createTray() {
 const iconPath = getTrayIconPath();

  tray = new Tray(iconPath);
  tray.setToolTip("EBT Printer Service");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "🟢 Printer Service is Running",
      enabled: false,
    },
    { type: "separator" },

    {
      label: "🧪 Test Print",
      click: async () => {
        try {
          await axios.post("http://127.0.0.1:9100/print/test");
        } catch {
          shell.showErrorBox("Printer Error", "Printer service not reachable");
        }
      },
    },

    { type: "separator" },

    {
      label: "📂 Open Logs",
      click: () => {
        shell.openExternal("http://127.0.0.1:9100/logs");
      },
    },

    {
      label: "🔄 Restart Service",
      click: () => {
        app.relaunch();
        app.exit(0);
      },
    },

    { type: "separator" },

    {
      label: "❌ Exit",
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

module.exports = { createTray };
