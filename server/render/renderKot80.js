const PAPER_WIDTH = 48;
const BLOCK_WIDTH = 32;

function centerBlock(text) {
  const padding = Math.max(
    0,
    Math.floor((PAPER_WIDTH - BLOCK_WIDTH) / 2)
  );
  return " ".repeat(padding) + text;
}

function textBig(printer) {
  if (printer.setTextSize) {
    printer.setTextSize(1, 2);
  }
}

function textNormal(printer) {
  if (printer.setTextSize) {
    printer.setTextSize(1, 1);
  }
}

async function renderKot80(printer, kot) {
  if (!kot || !Array.isArray(kot.items)) {
    throw new Error("Invalid KOT payload");
  }

  printer.clear();

  /* ===== TITLE ===== */
  printer.alignCenter();
  printer.bold(true);
  textBig(printer);
  printer.println(kot.title || "KOT");
  textNormal(printer);
  printer.bold(false);

  /* ===== COUNTER NAME ===== */
  if (kot.counterName) {
    printer.bold(true);
    textBig(printer);
    printer.println(kot.counterName.toUpperCase());
    textNormal(printer);
    printer.bold(false);
  }

  printer.drawLine();

  /* ===== META ===== */
  printer.alignCenter();
  printer.bold(true);
  if (kot.orderNo) printer.println(`Order: ${kot.orderNo}`);
  if (kot.table) printer.println(`Table: ${kot.table}`);
  if (kot.seat) printer.println(`Seat: ${kot.seat}`);
  printer.bold(false);

  printer.drawLine();

  /* ===== ITEMS (CENTERED BLOCK) ===== */
  printer.alignLeft();

  for (const i of kot.items) {
    const qty = i.qty || 1;
    const name = i.nameEn || "";
    const notes = i.notes?.trim();

    printer.bold(true);
    textBig(printer);
    printer.println(centerBlock(`${qty} x ${name}`));
    textNormal(printer);
    printer.bold(false);

    if (notes) {
      printer.bold(true);
      printer.println(centerBlock(`* ${notes}`));
      printer.bold(false);
    }
  }

  printer.cut({ feed: 0 });
}

module.exports = renderKot80;
