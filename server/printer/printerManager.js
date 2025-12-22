const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { app } = require("electron");
let printer = null;
let testMode = false;

const { CONFIG_PATH, ensureConfig } = require("../utils/config");
const isDev = !app.isPackaged;



ensureConfig();

const EXCLUDE_KEYWORDS = [
  "pdf",
  "xps",
  "onenote",
  "fax",
  "microsoft",
  "send to",
  "anydesk"
];

const THERMAL_KEYWORDS = [
  "epson",
  "tm-",
  "tmt",
  "tvse",
  "tvs",
  "gprinter",
  "zjiang",
  "xprinter",
  "thermal",
  "pos",
  "rp",
  "citizen"
];



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



function initPrinter(printerName, paperSize = "80MM") {
  if (!printerName) return;

 if (printerName === "__TEST__") {
    if (isDev) {
      testMode = true;
      console.log("🧪 TEST MODE ENABLED (DEV ONLY)");
    } else {
      console.warn("⚠️ TEST MODE IGNORED IN PRODUCTION");
    }
    return;
  }

  const { printer: ThermalPrinter, types: PrinterTypes } =
    require("node-thermal-printer");

  printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: `printer:${printerName}` || `\\spool\\${printerName}`,
    width: paperSize === "80MM" ? 48 : 32,
    removeSpecialCharacters: false,
  });

  if (!printer.isPrinterConnected()) {
    throw new Error(`❌ Printer not connected: ${printerName}`);
  }

  console.log("🖨️ Printer connected:", printerName);
}



function listPrinters() {
  try {
    const output = execSync(
  `powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"`,
  { encoding: "utf-8" }
);


    const printers = output
      .split("\n")
      .map(p => p.trim())
      .filter(p => p && p !== "Name");

    return printers.filter(name => {
      const l = name.toLowerCase();

      if (EXCLUDE_KEYWORDS.some(k => l.includes(k))) return false;

      return true;
    });
  } catch (e) {
    console.error("❌ Failed to detect printers", e);
    return [];
  }
}



function listPrintersCategorized() {
  const all = listPrinters();
  const thermal = [];
  const others = [];

  for (const p of all) {
    const l = p.toLowerCase();
    if (THERMAL_KEYWORDS.some(k => l.includes(k))) {
      thermal.push(p);
    } else {
      others.push(p);
    }
  }

  return { thermal, others };
}



function selectPrinter(printerName) {
  const config = loadConfig();

  config.printerName = printerName;
  saveConfig(config);
 
  printer = null;

  initPrinter(config.printerName, config.paperSize);

  return { success: true, printerName };
}



async function testPrint() {
  const p = getPrinter();

  p.clear();
  p.alignCenter();
  p.bold();
  p.println("TEST PRINT");
  p.normal();
  p.newLine();
  p.println("Printer configured successfully");
  p.newLine();
  p.println(new Date().toLocaleString());
  p.newLine();
  p.cut();

  await p.execute();

  return { success: true };
}


function getPrinter() {
  if (testMode && isDev) {
    return {
      clear: () => {},
      alignCenter: () => {},
      alignLeft: () => {},
      bold: () => {},
      normal: () => {},
      println: (t = "") => console.log("[PRINT]", t),
      newLine: () => console.log(""),
      drawLine: () => console.log("-".repeat(48)),
      printImage: () => console.log("[IMAGE]"),
      cut: () => console.log("---- CUT ----"),
      execute: async () => true,
    };
  }

  if (!printer) throw new Error("Printer not initialized");
  return printer;
}



module.exports = {
  initPrinter,
  getPrinter,
  listPrinters,
  listPrintersCategorized,
  selectPrinter,
  testPrint,
  loadConfig,
};
