const fs = require("fs");
const { execSync } = require("child_process");
const { app, BrowserWindow } = require("electron");

let printer = null;
let testMode = false;
let printMode = "NONE"; // ESC_POS | GDI | TEST

const { CONFIG_PATH, ensureConfig } = require("../utils/config");
const isDev = !app.isPackaged;

ensureConfig();

/* =============================
   CONSTANTS
============================= */

const EXCLUDE_KEYWORDS = [
  "pdf", "xps", "onenote", "fax", "microsoft", "send to", "anydesk"
];

// USB spooler printers unreliable with ESC/POS on Windows
const FORCE_GDI_KEYWORDS = [
  "citizen",
  "ct-d",
  "tvs",
  "rp",
  "star"
];

/* =============================
   CONFIG CACHE
============================= */

let cachedConfig = null;

function loadConfig() {
  if (!cachedConfig) {
    cachedConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  }
  return cachedConfig;
}

function saveConfig(config) {
  cachedConfig = config;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

/* =============================
   INIT PRINTER
============================= */

function initPrinter(printerName, paperSize = "80MM") {
  printer = null;
  testMode = false;
  printMode = "NONE";

  if (!printerName) return;

  /* ---------- TEST MODE ---------- */
  if (printerName === "__TEST__") {
    if (!isDev) {
      console.warn("⚠️ TEST MODE IGNORED IN PRODUCTION");
      return;
    }
    testMode = true;
    printMode = "TEST";
    console.log("🧪 TEST MODE ENABLED (DEV ONLY)");
    return;
  }

  const lower = printerName.toLowerCase();
  const isTcp = printerName.startsWith("tcp://");

  /* ---------- FORCE GDI FOR USB ---------- */
  if (!isTcp && FORCE_GDI_KEYWORDS.some(k => lower.includes(k))) {
    printMode = "GDI";
    console.log("🧷 Using GDI mode for USB printer:", printerName);
    return;
  }

  /* ---------- TRY ESC/POS ---------- */
  try {
    const { printer: ThermalPrinter, types: PrinterTypes } =
      require("node-thermal-printer");

    const iface = isTcp
      ? printerName
      : `printer:${printerName}`;

  const p = new ThermalPrinter({
  type: PrinterTypes.EPSON,
  interface: iface,
  width: paperSize === "80MM" ? 48 : 32,
  removeSpecialCharacters: false,
  options: { timeout: 5000 },
});

// ✅ Normalize API
if (typeof p.bold === "function") {
  p.normal = () => p.bold(false);
} else {
  p.bold = () => {};
  p.normal = () => {};
}

printer = p;
printMode = "ESC_POS";
console.log("🖨️ ESC/POS mode active:", printerName);

    return;

  } catch (err) {
    console.warn("⚠️ ESC/POS init failed, falling back to GDI:", err.message);
    printMode = "GDI";
  }
}

/* =============================
   GDI PRINT (Windows Spooler)
============================= */

function gdiPrint(html) {
  const { printerName } = loadConfig();
  if (!printerName) return Promise.reject("No printer selected");

  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({ show: false });

    const timeout = setTimeout(() => {
      win.destroy();
      reject("GDI print timeout");
    }, 15000);

    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    win.webContents.on("did-finish-load", () => {
      win.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: printerName,
        },
        success => {
          clearTimeout(timeout);
          win.destroy();
          success ? resolve() : reject("GDI print failed");
        }
      );
    });
  });
}

/* =============================
   GET PRINTER
============================= */

function getPrinter() {
  /* ---------- TEST MODE ---------- */
  if (testMode && isDev) {
    return {
      clear: () => {},
      alignCenter: () => {},
      alignLeft: () => {},
      bold: () => {},
      normal: () => {},
      println: t => console.log("[PRINT]", t),
      newLine: () => console.log(""),
      drawLine: () => console.log("-".repeat(48)),
      printImage: () => console.log("[IMAGE]"),
      cut: () => console.log("---- CUT ----"),
      execute: async () => true,
    };
  }

  /* ---------- ESC/POS ---------- */
  if (printMode === "ESC_POS") {
    if (!printer) throw new Error("ESC/POS printer not initialized");
    return printer;
  }

  /* ---------- GDI ---------- */
  if (printMode === "GDI") {
    let buffer = "";

    return {
      clear: () => (buffer = ""),
      alignCenter: () => (buffer += `<div style="text-align:center">`),
      alignLeft: () => (buffer += `</div><div style="text-align:left">`),
      bold: () => (buffer += "<b>"),
      normal: () => (buffer += "</b>"),
      println: t => (buffer += `${t || ""}<br/>`),
      newLine: () => (buffer += "<br/>"),
      drawLine: () => (buffer += `${"-".repeat(48)}<br/>`),
      printImage: () => (buffer += "[IMAGE]<br/>"),
      cut: () => (buffer += "<hr/>"),
      execute: async () => {
        const html = `
          <html>
            <body style="font-family: monospace; font-size: 12px">
              ${buffer}
            </body>
          </html>`;
        buffer = "";
        await gdiPrint(html);
      },
    };
  }

  throw new Error("Printer not initialized");
}

/* =============================
   PRINTER DISCOVERY
============================= */

function listPrinters() {
  try {
    const output = execSync(
      `powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"`,
      { encoding: "utf-8" }
    );

    return output
      .split("\n")
      .map(p => p.trim())
      .filter(
        p =>
          p &&
          !EXCLUDE_KEYWORDS.some(k =>
            p.toLowerCase().includes(k)
          )
      );
  } catch (e) {
    console.error("❌ Failed to detect printers", e);
    return [];
  }
}

/* =============================
   SELECT PRINTER
============================= */

function selectPrinter(printerName) {
  const config = loadConfig();
  config.printerName = printerName;
  saveConfig(config);

  initPrinter(config.printerName, config.paperSize);

  return {
    success: true,
    printerName,
    mode: printMode,
  };
}

/* =============================
   EXPORTS
============================= */

module.exports = {
  initPrinter,
  getPrinter,
  listPrinters,
  selectPrinter,
  loadConfig,
};
