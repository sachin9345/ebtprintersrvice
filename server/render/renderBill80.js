const path = require("path");
const fs = require("fs");
const axios = require("axios");
const { textToImage } = require("../utils/imageUtils");


const LINE_WIDTH = 48;

const COL_ITEM = 24;
const COL_QTY = 6;
const COL_PRICE = 9;
const COL_TOTAL = 9;


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

function printTotalRow(printer, label, value, bold = false) {
  const labelWidth = COL_ITEM + COL_QTY + COL_PRICE;
  const left = padRight(label, labelWidth);
  const right = padLeft(value, COL_TOTAL);

  if (bold) printer.bold();
  printer.println(left + right);
  if (bold) printer.normal();
}



async function downloadImage(url) {
  const filePath = path.join(__dirname, "..", "tmp-logo.png");
  const res = await axios.get(url, { responseType: "arraybuffer" });
  fs.writeFileSync(filePath, res.data);
  return filePath;
}



async function renderBill80(printer, bill) {
  if (!bill || !Array.isArray(bill.items)) {
    throw new Error("Invalid BILL payload");
  }

  const s = bill.settings || {};

  printer.clear();
  printer.alignCenter();

  if (s.showBillLogo && bill.logoUrl) {
    try {
      const logoPath = await downloadImage(bill.logoUrl);
      await printer.printImage(logoPath);
      printer.newLine();
    } catch {}
  }

  printer.alignCenter();

  if (s.showHotelName && bill.hotelName) {
    printer.bold();
    printer.println(bill.hotelName);
    printer.normal();
  }

  if (s.showBillHeader && bill.billHeader) {
    printer.println(bill.billHeader);
  }

  if (s.showAddress && bill.address) {
    bill.address.split("\n").forEach(line => printer.println(line));
  }

  if (s.showPhone && bill.phone) printer.println(`Ph: ${bill.phone}`);
  if (s.showMail && bill.email) printer.println(bill.email);
  if (s.showGstin && bill.gstin) printer.println(`GSTIN: ${bill.gstin}`);

  printer.newLine();

  printer.println(`Order No: ${bill.orderNo}`);
  printer.println(new Date(bill.date).toLocaleString());

  printLine(printer);

  printer.alignLeft();

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

    const qty = padLeft(i.qty, COL_QTY);
    const price = padLeft(Number(i.price).toFixed(2), COL_PRICE);
    const total = padLeft(Number(i.total).toFixed(2), COL_TOTAL);

    printer.println(
      padRight(nameLines[0], COL_ITEM) + qty + price + total
    );

    for (let l = 1; l < nameLines.length; l++) {
      printer.println(padRight(nameLines[l], COL_ITEM));
    }

    if (s.showSecondaryName && i.nameTa) {
      try {
        await printer.printImage(await textToImage(i.nameTa));
      } catch {}
    }
  }

  printLine(printer);

  if (s.showGstInclusive) {
    printTotalRow(printer, "Subtotal", Number(bill.subtotal).toFixed(2));
    printTotalRow(printer, "GST", Number(bill.tax).toFixed(2));
  }

  if (s.showDiscount && bill.discount > 0) {
    printTotalRow(
      printer,
      "Discount",
      `-${Number(bill.discount).toFixed(2)}`
    );
  }

  if (s.showAdditionalCharges && bill.additionalCharges > 0) {
    printTotalRow(
      printer,
      "Other Charges",
      Number(bill.additionalCharges).toFixed(2)
    );
  }

  printLine(printer);

  printTotalRow(
    printer,
    "GRAND TOTAL",
    Number(bill.grandTotal).toFixed(2),
    true
  );

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
