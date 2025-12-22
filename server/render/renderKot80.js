const { textToImage } = require("../utils/imageUtils");

async function renderKot80(printer, kot) {
  printer.clear();
  printer.alignCenter();

  printer.bold(true);
  printer.println(kot.title || "KOT");
  printer.bold(false);

  printer.drawLine();
  printer.alignLeft();

  if (kot.orderNo) printer.println(`Order: ${kot.orderNo}`);
  if (kot.table) printer.println(`Table: ${kot.table}`);
  if (kot.seat) printer.println(`Seat: ${kot.seat}`);

  printer.drawLine();

  for (const i of kot.items || []) {
    printer.bold(true);
    printer.println(`${i.qty} x ${i.nameEn}`);
    printer.bold(false);

    if (i.nameTa) {
      printer.printImage(await textToImage(i.nameTa));
    }

    printer.newLine();
  }

  printer.cut();
}

module.exports = renderKot80;
