const { Tray, Menu, shell, app, dialog } = require("electron");
const path = require("path");
const axios = require("axios");
const { openIpPrompt } = require("./ipPrompt");



let tray = null;
const API_BASE = "http://127.0.0.1:9100";

/* =========================
   ICON PATH
========================= */
function getTrayIconPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "assets", "print.ico")
    : path.join(__dirname, "assets", "print.ico");
}

/* =========================
   API HELPERS
========================= */
async function fetchPrinters() {
  const res = await axios.get(`${API_BASE}/printers`);
  return res.data;
}

async function fetchHealth() {
  const res = await axios.get(`${API_BASE}/health`);
  return res.data;
}

async function selectPrinter(printerName) {
  await axios.post(`${API_BASE}/printers/select`, { printerName });
}

/* =========================
   HELPERS
========================= */
function isDirectCable(ip) {
  return ip.startsWith("169.254.");
}

function formatNetworkLabel(printer) {
  const ip = printer.id.replace("tcp://", "").split(":")[0];
  return isDirectCable(ip)
    ? `🟡 ${printer.name} (Direct Cable)`
    : `🟢 ${printer.name} (LAN / Wi-Fi)`;
}

/* =========================
   MANUAL ADD BY IP (KEY FIX)
========================= */

/* =========================
   ADD PRINTER BY IP
========================= */
async function addPrinterByIp() {
  const ip = await openIpPrompt(tray);

  if (!ip) return;

  const cleanIp = ip.trim();
  const printerId = `tcp://${cleanIp}:9100`;

  try {
    await selectPrinter(printerId);
    dialog.showMessageBox({
      type: "info",
      message: "Printer added successfully",
      detail: printerId,
    });
    createTray();
  } catch {
    dialog.showErrorBox(
      "Printer Error",
      "Unable to connect to printer.\nCheck IP and cable."
    );
  }
}


/* =========================
   STATUS LABEL
========================= */
async function getPrinterStatusLabel() {
  try {
    const health = await fetchHealth();

    if (!health.printer) return "⚠️ No printer selected";

    if (health.printer.startsWith("tcp://")) {
      return "🟢 Network Printer Connected";
    }

    return "🟡 USB Printer Connected";

  } catch {
    return "❌ Printer service unreachable";
  }
}

/* =========================
   BUILD PRINTER MENU
========================= */
async function buildPrinterMenu() {
  const data = await fetchPrinters();
  const health = await fetchHealth();
  const current = health.printer;

  const menu = [];
  const seen = new Set();

  /* CURRENT PRINTER */
  if (current) {
    menu.push({ label: "Current Printer", enabled: false });
    menu.push({
      label: `🟢 ${current.replace("tcp://", "")}`,
      type: "radio",
      checked: true,
      enabled: false,
    });
    menu.push({ type: "separator" });
    seen.add(current);
  }

  /* USB PRINTERS */
  if (data.usb?.length) {
    menu.push({ label: "USB Printers", enabled: false });
    data.usb.forEach(p =>
      menu.push({
        label: `🟡 ${p.name} (USB)`,
        type: "radio",
        checked: p.id === current,
        click: () => selectPrinter(p.id),
      })
    );
  }

  /* NETWORK PRINTERS */
  if (data.network?.length) {
    menu.push({ type: "separator" });
    menu.push({ label: "Network Printers", enabled: false });

    data.network.forEach(p => {
      if (seen.has(p.id)) return;
      menu.push({
        label: formatNetworkLabel(p),
        type: "radio",
        checked: p.id === current,
        click: () => selectPrinter(p.id),
      });
    });
  }

  /* MANUAL ADD */
  menu.push({ type: "separator" });
  menu.push({
    label: "➕ Add Network Printer (IP)",
    click: addPrinterByIp,
  });

  return menu;
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

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: statusLabel, enabled: false },
      { type: "separator" },
      { label: "🖨️ Select Printer", submenu: printerMenu },
      { type: "separator" },
      {
        label: "🧪 Test Print console",
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
        click: () => shell.openExternal(`${API_BASE}/logs`),
      },
      {
        label: "🔄 Restart Service",
        click: () => {
          app.relaunch();
          app.exit(0);
        },
      },
      { type: "separator" },
      { label: "❌ Exit", click: () => app.exit(0) },
    ])
  );
}

module.exports = { createTray };
