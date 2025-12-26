const { Tray, Menu, shell, app, dialog } = require("electron");
const path = require("path");
const axios = require("axios");

let tray = null;
const API_BASE = "http://127.0.0.1:9100";

/* =========================
   ICON PATH
   ========================= */
function getTrayIconPath() {
  if (!app.isPackaged) {
    return path.join(__dirname, "assets", "print.ico");
  }
  return path.join(process.resourcesPath, "assets", "print.ico");
}

/* =========================
   API HELPERS
   ========================= */
async function fetchPrinters() {
  const res = await axios.get(`${API_BASE}/printers`);
  return res.data.printers || [];
}

async function fetchHealth() {
  const res = await axios.get(`${API_BASE}/health`);
  return res.data;
}

async function selectPrinter(printerName) {
  await axios.post(`${API_BASE}/printers/select`, { printerName });
}

/* =========================
   STATUS LABEL
   ========================= */
async function getPrinterStatusLabel() {
  try {
    const health = await fetchHealth();

    if (!health.printer) {
      return "⚠️ No printer selected";
    }

    if (health.printer === "__TEST__") {
      return "🧪 Test Mode : Virtual Printer";
    }

    return health.connected
      ? `🟢 Connected : ${health.printer}`
      : `🔴 Disconnected : ${health.printer}`;

  } catch {
    return "❌ Printer service unreachable";
  }
}

/* =========================
   BUILD PRINTER SUBMENU
   ========================= */
async function buildPrinterMenu() {
  try {
    const printers = await fetchPrinters();
    const health = await fetchHealth();
    const current = health.printer;

    if (!printers.length) {
      return [{ label: "No printers found", enabled: false }];
    }

    return printers.map(name => ({
      label: name,
      type: "radio",
      checked: name === current,
      click: async () => {
        try {
          await selectPrinter(name);
          dialog.showMessageBox({
            type: "info",
            message: `Printer selected:\n${name}`,
          });
          createTray(); // refresh tray
        } catch {
          dialog.showErrorBox(
            "Printer Error",
            "Failed to select printer"
          );
        }
      },
    }));
  } catch {
    return [{ label: "Printer service not reachable", enabled: false }];
  }
}

/* =========================
   CREATE TRAY
   ========================= */
async function createTray() {
  if (tray) tray.destroy();

  tray = new Tray(getTrayIconPath());
  tray.setToolTip("EBT Printer Service");

  const statusLabel = await getPrinterStatusLabel();
  const printerMenu = await buildPrinterMenu();

  const contextMenu = Menu.buildFromTemplate([
    {
      label: statusLabel,
      enabled: false,
    },

    { type: "separator" },

    {
      label: "🖨️ Select Printer",
      submenu: printerMenu,
    },

    {
      label: "🔄 Refresh Printers",
      click: () => createTray(),
    },

    { type: "separator" },

    {
      label: "🧪 Test Print",
      click: async () => {
        try {
          await axios.post(`${API_BASE}/print/test`);
        } catch {
          dialog.showErrorBox(
            "Printer Error",
            "Printer service not reachable"
          );
        }
      },
    },

    { type: "separator" },

    {
      label: "📂 Open Logs",
      click: () => {
        shell.openExternal(`${API_BASE}/logs`);
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
        app.exit(0);
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

module.exports = { createTray };
