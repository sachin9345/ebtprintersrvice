const express = require("express");
const cors = require("cors");
const fs = require("fs");

const {
  initPrinter,
  getPrinter,
  listPrinters,
  selectPrinter,
  loadConfig
} = require("./printer/printerManager");

const { enqueue } = require("./printer/printQueue");
const renderBill80 = require("./render/renderBill80");
const renderKot80 = require("./render/renderKot80");
const { log, logError, LOG_FILE } = require("./utils/logger");


const app = express();
app.use(cors());
app.use(express.json());

let config = loadConfig();


try {
  initPrinter(config.printerName, config.paperSize);
} catch (err) {
  logError("Printer init failed at boot", err);
}


app.get("/health", (_, res) => {
  let connected = false;
  try {
    connected = !!getPrinter();
  } catch {}

  res.json({
    running: true,
    printer: config.printerName,
    connected
  });
});


app.get("/printers", (_, res) => {
  const printers = listPrinters();
  res.json({ printers });
});


app.post("/printers/select", (req, res) => {
  const { printerName } = req.body;

  if (!printerName) {
    return res.status(400).json({ error: "Printer name required" });
  }

  try {
    selectPrinter(printerName);
    res.json({ success: true, printerName });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/logs", (_, res) => {
  res.sendFile(LOG_FILE);
});

app.post("/print/test", (_, res) => {
  enqueue(async () => {
    const printer = getPrinter();
    printer.clear();
    printer.alignCenter();
    printer.bold();
    printer.println("TEST PRINT");
    printer.normal();
    printer.println("Printer connected successfully");
    printer.println(new Date().toLocaleString());
    printer.cut();
    await printer.execute();
  });

  res.json({ success: true });
});


app.post("/print/bill", (req, res) => {
  enqueue(async () => {
    const printer = getPrinter();
    await renderBill80(printer, req.body.bill);
    await printer.execute();
  });
  res.json({ success: true });
});


app.post("/print/kot-and-bill", (req, res) => {
  enqueue(async () => {
    const printer = getPrinter();

    await renderKot80(printer, req.body.kot);
    await printer.execute();

    await new Promise(r => setTimeout(r, 200));

    await renderBill80(printer, req.body.bill);
    await printer.execute();
  });
  res.json({ success: true });
});


app.post("/print/kot", (req, res) => {
  enqueue(async () => {
    try {
      const printer = getPrinter();

      await renderKot80(printer, req.body.kot);
      await printer.execute();

      log("KOT printed successfully");
    } catch (err) {
      logError("KOT print failed", err);
      throw err;
    }
  });

  res.json({ success: true });
});

log("Printer service booting");
app.listen(9100, "127.0.0.1", () =>
  console.log("🖨️ Printer service running on http://127.0.0.1:9100")
);
