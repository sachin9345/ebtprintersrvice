/**
 * FINAL PRODUCTION PRINTER MANAGER
 * Works with:
 * - USB
 * - Direct LAN (PC ↔ Printer)
 * - LAN via Router
 * - Wi-Fi
 */

const fs = require("fs");
const os = require("os");
const net = require("net");
const { execSync } = require("child_process");
const { app, BrowserWindow } = require("electron");

let printer = null;
let printMode = "NONE"; // ESC_POS | GDI

const { CONFIG_PATH, ensureConfig } = require("../utils/config");
ensureConfig();

/* =============================
   CONFIG
============================= */

let cachedConfig = null;

function loadConfig() {
  if (!cachedConfig) {
    cachedConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  }
  return cachedConfig;
}

function saveConfig(cfg) {
  cachedConfig = cfg;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

/* =============================
   ESC/POS INIT
============================= */

function initEscPos(iface, paperSize) {
  const { printer: ThermalPrinter, types } =
    require("node-thermal-printer");

  printer = new ThermalPrinter({
    type: types.EPSON,
    interface: iface,
    width: paperSize === "80MM" ? 48 : 32,
    options: { timeout: 5000 },
  });

  printer.normal = () => printer.bold(false);
}

/* =============================
   PROBE ESC/POS
============================= */

async function probeEscPos(p) {
  try {
    p.clear();
    p.println("TEST");
    p.cut();
    await p.execute();
    return true;
  } catch {
    return false;
  }
}

/* =============================
   INIT PRINTER
============================= */

async function initPrinter(printerId, paperSize = "80MM") {
  printer = null;
  printMode = "NONE";

  if (!printerId) return;

  // NETWORK PRINTER (LAN / WiFi / Direct Cable)
  if (printerId.startsWith("tcp://")) {
    initEscPos(printerId, paperSize);
    printMode = "ESC_POS";
    return;
  }

  // WINDOWS PRINTER (USB / Bluetooth)
  try {
    initEscPos(`printer:${printerId}`, paperSize);
    const ok = await probeEscPos(printer);
    if (!ok) throw new Error();
    printMode = "ESC_POS";
  } catch {
    printer = null;
    printMode = "GDI";
  }
}

/* =============================
   GDI PRINT
============================= */

function gdiPrint(html) {
  const { printerName } = loadConfig();

  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({ show: false });
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    win.webContents.on("did-finish-load", () => {
      win.webContents.print(
        { silent: true, deviceName: printerName },
        ok => (ok ? resolve() : reject())
      );
    });
  });
}

/* =============================
   GET PRINTER
============================= */

function getPrinter() {
  if (printMode === "ESC_POS") return printer;

  if (printMode === "GDI") {
    let buffer = "";
    return {
      clear: () => (buffer = ""),
      println: t => (buffer += `${t}<br/>`),
      cut: () => {},
      execute: async () => {
        await gdiPrint(`<body>${buffer}</body>`);
        buffer = "";
      },
    };
  }

  throw new Error("Printer not ready");
}

/* =============================
   DISCOVER USB PRINTERS
============================= */

function listUsbPrinters() {
  try {
    const out = execSync(
      `powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"`,
      { encoding: "utf-8" }
    );

    return out
      .split("\n")
      .map(p => p.trim())
      .filter(Boolean)
      .map(name => ({
        id: name,
        name,
        type: "USB",
      }));
  } catch {
    return [];
  }
}

/* =============================
   DISCOVER NETWORK PRINTERS
============================= */

function getSubnet() {
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    for (const i of list) {
      if (i.family === "IPv4" && !i.internal) {
        const p = i.address.split(".");
        return `${p[0]}.${p[1]}.${p[2]}.`;
      }
    }
  }
  return null;
}

async function listNetworkPrinters() {
  const subnet = getSubnet();
  if (!subnet) return [];

  const found = [];
  const jobs = [];

  for (let i = 1; i <= 254; i++) {
    const ip = subnet + i;
    jobs.push(
      new Promise(resolve => {
        const s = new net.Socket();
        s.setTimeout(250);
        s.connect(9100, ip, () => {
          found.push({
            id: `tcp://${ip}:9100`,
            name: `Network Printer (${ip})`,
            type: "NETWORK",
          });
          s.destroy();
          resolve();
        });
        s.on("error", () => resolve());
        s.on("timeout", () => {
          s.destroy();
          resolve();
        });
      })
    );
  }

  await Promise.all(jobs);
  return found;
}

/* =============================
   PUBLIC API
============================= */

async function listPrinters() {
  return {
    usb: listUsbPrinters(),
    network: await listNetworkPrinters(),
  };
}

async function selectPrinter(printerName) {
  const cfg = loadConfig();
  cfg.printerName = printerName;
  saveConfig(cfg);
  await initPrinter(printerName, cfg.paperSize);
  return { success: true, mode: printMode };
}

module.exports = {
  initPrinter,
  getPrinter,
  listPrinters,
  selectPrinter,
  loadConfig,
};
