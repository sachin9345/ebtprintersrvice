const path = require("path");
const fs = require("fs");
const axios = require("axios");
const { app } = require("electron");
const { textToImage } = require("../utils/imageUtils");
const { saveBufferAsImage } = require("../utils/saveTempImage");

/* ================= CONSTANTS ================= */

const LINE_WIDTH = 48;

const COL_ITEM = 24;
const COL_QTY = 6;
const COL_PRICE = 9;
const COL_TOTAL = 9;

const CACHE_DIR = path.join(app.getPath("userData"), "cache");
const LOGO_CACHE = path.join(CACHE_DIR, "bill-logo.png");

/* ================= HELPERS ================= */

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function money(v) {
  return Number(v || 0).toFixed(2);
}

function padRight(text = "", len) {
  text = String(text);
  return text.length > len
    ? text.slice(0, len)
    : text + " ".repeat(len - text.length);
}

function padLeft(text = "", len) {
  text = String(text);
  return text.length > len
    ? text.slice(0, len)
    : " ".repeat(len - text.length) + text;
}

function wrapText(text = "", width) {
  const words = text.split(" ");
  const lines = [];
  let line = "";

  for (const w of words) {
    if ((line + w).length <= width) {
      line += (line ? " " : "") + w;
    } else {
      lines.push(line);
      line = w;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function printLine(printer) {
  printer.println("-".repeat(LINE_WIDTH));
}

/**
 * Right-align full line (label + value together)
 * Works on ESC/POS & GDI
 */
function printRightAligned(printer, text, bold = false, big = false) {
  if (bold) printer.bold();

  if (big && printer.setTextDoubleHeight) {
    printer.setTextDoubleHeight();
    printer.setTextDoubleWidth();
  }

  printer.println(padLeft(text, LINE_WIDTH));

  if (big && printer.setTextNormal) {
    printer.setTextNormal();
  }

  if (bold) printer.normal();
}

/* ================= IMAGE HANDLING ================= */

async function downloadLogo(url) {
  ensureCacheDir();

  if (fs.existsSync(LOGO_CACHE)) {
    return LOGO_CACHE;
  }

  const res = await axios.get(url, { responseType: "arraybuffer" });
  fs.writeFileSync(LOGO_CACHE, res.data);
  return LOGO_CACHE;
}

/* ================= MAIN RENDER ================= */

async function renderBill80(printer, bill) {
  if (!bill || !Array.isArray(bill.items)) {
    throw new Error("Invalid BILL payload");
  }

  const s = bill.settings || {};

  printer.clear();
  printer.alignCenter();

  /* ===== LOGO ===== */
  if (s.showBillLogo && bill.logoUrl) {
    try {
      const logoPath = await downloadLogo(bill.logoUrl);
      await printer.printImage(logoPath);
      printer.newLine();
    } catch (e) {
      console.warn("⚠️ Logo print failed:", e.message);
    }
  }

  /* ===== HEADER ===== */

  if (s.showHotelName && bill.hotelName) {
    printer.bold();
    printer.println(bill.hotelName);
    printer.normal();
  }

  if (s.showBillHeader && bill.billHeader) {
    printer.println(bill.billHeader);
  }

  if (s.showAddress && bill.address) {
    bill.address.split("\n").forEach(l => printer.println(l));
  }

  if (s.showPhone && bill.phone) printer.println(`Ph: ${bill.phone}`);
  if (s.showMail && bill.email) printer.println(bill.email);
  if (s.showGstin && bill.gstin) printer.println(`GSTIN: ${bill.gstin}`);

  printLine(printer);

  printer.alignLeft();
  printer.println(`Order No: ${bill.orderNo}`);
  printer.println(new Date(bill.date).toLocaleString());

  /* ===== ITEMS ===== */

  printLine(printer);

  printer.bold();
  printer.println(
    padRight("ITEM", COL_ITEM) +
      padLeft("QTY", COL_QTY) +
      padLeft("PRICE", COL_PRICE) +
      padLeft("TOTAL", COL_TOTAL)
  );
  printer.normal();

  printLine(printer);

  for (const i of bill.items) {
    const nameLines = wrapText(i.nameEn || "", COL_ITEM);

    printer.println(
      padRight(nameLines[0], COL_ITEM) +
        padLeft(i.qty || 0, COL_QTY) +
        padLeft(money(i.price), COL_PRICE) +
        padLeft(money(i.total), COL_TOTAL)
    );

    for (let l = 1; l < nameLines.length; l++) {
      printer.println(padRight(nameLines[l], COL_ITEM));
    }

    if (s.showSecondaryName && i.nameTa) {
      try {
        const buffer = await textToImage(i.nameTa);
        if (buffer) {
          const imgPath = saveBufferAsImage(buffer, "ta");
          await printer.printImage(imgPath);
        }
      } catch (e) {
        console.warn("⚠️ Tamil render failed:", e.message);
      }
    }
  }

  /* ===== TOTALS (RIGHT ALIGNED) ===== */

  printLine(printer);

  if (s.showGstInclusive) {
    printRightAligned(printer, `Subtotal: ${money(bill.subtotal)}`);
    printRightAligned(printer, `GST: ${money(bill.tax)}`);
  }

  if (s.showDiscount && bill.discount > 0) {
    printRightAligned(
      printer,
      `Discount -${money(bill.discount)}`
    );
  }

  if (s.showAdditionalCharges && bill.additionalCharges > 0) {
    printRightAligned(
      printer,
      `Other Charges ${money(bill.additionalCharges)}`
    );
  }

  printLine(printer);

  printRightAligned(
    printer,
    `GRAND TOTAL ${money(bill.grandTotal)}`,
    true,  // bold
    true   // double size (ESC/POS)
  );

  /* ===== FOOTER ===== */

  if (s.showPaymentMode) {
    printer.newLine();
    printer.println(`Paid via: ${bill.paymentMode}`);
  }

  if (s.showPaymentStatus) {
    printer.println(`Status: ${bill.paymentStatus}`);
  }

  if (s.showBillFooter && bill.billFooter) {
    printer.newLine();
    printer.alignCenter();
    printer.println(bill.billFooter);
  }

  printer.newLine();
  printer.cut();
}

module.exports = renderBill80;
