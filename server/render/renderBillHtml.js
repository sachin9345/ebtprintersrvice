/**
 * GDI / USB / Bluetooth HTML Bill Renderer
 * Matches ESC/POS layout exactly
 */

function money(v) {
  return Number(v || 0).toFixed(2);
}

function esc(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function wrapText(text = "", width = 24) {
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

function itemRow(item) {
  const nameLines = wrapText(item.nameEn || "", 24);

  let html = `
    <div class="row">
      <span class="item">${esc(nameLines[0])}</span>
      <span class="qty">${item.qty}</span>
      <span class="price">${money(item.price)}</span>
      <span class="total">${money(item.total)}</span>
    </div>
  `;

  for (let i = 1; i < nameLines.length; i++) {
    html += `
      <div class="row">
        <span class="item">${esc(nameLines[i])}</span>
      </div>
    `;
  }

  if (item.nameTa) {
    html += `<div class="ta">${esc(item.nameTa)}</div>`;
  }

  return html;
}

function rightLine(label, value) {
  return `
    <div class="right-line">
      <span>${esc(label)}</span>
      <span>${money(value)}</span>
    </div>
  `;
}

function renderBillHtml(printer, bill) {
  const s = bill.settings || {};

  let html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
@page {
  size: 80mm auto;
  margin: 4mm;
}

body {
  font-family: Consolas, "Courier New", monospace;
  font-size: 12px;
  margin: 0;
  padding: 0;
}

.center { text-align: center; }
.left { text-align: left; }
.right { text-align: right; }

.bold { font-weight: bold; }

.big {
  font-size: 16px;
  font-weight: bold;
}

.line {
  border-top: 1px dashed #000;
  margin: 6px 0;
}

.row {
  display: flex;
  justify-content: space-between;
}

.item  { width: 50%; }
.qty   { width: 10%; text-align: right; }
.price { width: 20%; text-align: right; }
.total { width: 20%; text-align: right; }

.right-line {
  display: flex;
  justify-content: space-between;
  text-align: right;
}

.ta {
  font-size: 11px;
  margin-left: 4px;
}
</style>
</head>
<body>
`;

  /* ===== HEADER ===== */

  if (s.showHotelName && bill.hotelName) {
    html += `<div class="center bold">${esc(bill.hotelName)}</div>`;
  }

  if (s.showBillHeader && bill.billHeader) {
    html += `<div class="center">${esc(bill.billHeader)}</div>`;
  }

  if (s.showAddress && bill.address) {
    bill.address.split("\n").forEach(l => {
      html += `<div class="center">${esc(l)}</div>`;
    });
  }

  if (s.showPhone && bill.phone) {
    html += `<div class="center">Ph: ${esc(bill.phone)}</div>`;
  }

  if (s.showMail && bill.email) {
    html += `<div class="center">${esc(bill.email)}</div>`;
  }

  if (s.showGstin && bill.gstin) {
    html += `<div class="center">GSTIN: ${esc(bill.gstin)}</div>`;
  }

  html += `<div class="line"></div>`;

  html += `
    <div>Order No: ${bill.orderNo}</div>
    <div>${new Date(bill.date).toLocaleString()}</div>
  `;

  /* ===== ITEMS ===== */

  html += `<div class="line"></div>`;

  html += `
    <div class="row bold">
      <span class="item">ITEM</span>
      <span class="qty">QTY</span>
      <span class="price">PRICE</span>
      <span class="total">TOTAL</span>
    </div>
  `;

  html += `<div class="line"></div>`;

  for (const item of bill.items) {
    html += itemRow(item);
  }

  /* ===== TOTALS ===== */

  html += `<div class="line"></div>`;

  if (s.showGstInclusive) {
    html += rightLine("Subtotal", bill.subtotal);
    html += rightLine("GST", bill.tax);
  }

  if (s.showDiscount && bill.discount > 0) {
    html += rightLine("Discount", -bill.discount);
  }

  if (s.showAdditionalCharges && bill.additionalCharges > 0) {
    html += rightLine("Other Charges", bill.additionalCharges);
  }

  html += `<div class="line"></div>`;

  html += `
    <div class="right big">
      GRAND TOTAL ${money(bill.grandTotal)}
    </div>
  `;

  /* ===== FOOTER ===== */

  if (s.showPaymentMode) {
    html += `<div>Paid via: ${esc(bill.paymentMode)}</div>`;
  }

  if (s.showPaymentStatus) {
    html += `<div>Status: ${esc(bill.paymentStatus)}</div>`;
  }

  if (s.showBillFooter && bill.billFooter) {
    html += `<div class="center">${esc(bill.billFooter)}</div>`;
  }

  html += `
</body>
</html>
`;

  /* ===== SEND TO GDI PRINTER ===== */

  printer.clear();
  printer.println(html);
}

module.exports = renderBillHtml;
