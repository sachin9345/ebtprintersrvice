const { textToImage } = require("../utils/imageUtils");


async function renderKot80(printer, kot) {
  if (!kot || !Array.isArray(kot.items)) {
    throw new Error("Invalid KOT payload");
  }

  printer.clear();
  printer.alignCenter();

  printer.bold();
  printer.println(kot.title || "KOT");
  printer.normal();

  printer.drawLine();
  printer.alignLeft();

  if (kot.orderNo) printer.println(`Order: ${kot.orderNo}`);
  if (kot.table) printer.println(`Table: ${kot.table}`);
  if (kot.seat) printer.println(`Seat: ${kot.seat}`);
  if (kot.time) printer.println(new Date(kot.time).toLocaleTimeString());

  printer.drawLine();

  for (const i of kot.items) {
    printer.bold();
    printer.println(`${i.qty || 1} x ${i.nameEn || ""}`);
    printer.normal();

    if (i.nameTa) {
      try {
        await printer.printImage(await textToImage(i.nameTa));
      } catch (e) {
        console.warn("⚠️ Tamil KOT render failed:", e.message);
      }
    }

    printer.newLine();
  }

  printer.cut();
}

module.exports = renderKot80;
