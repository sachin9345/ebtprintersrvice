const escpos = require("escpos");
escpos.USB = require("escpos-usb");

async function usbTestPrint() {
  // Auto-detect USB ESC/POS printer
  const device = new escpos.USB();
  const printer = new escpos.Printer(device, {
    encoding: "GB18030", // safest encoding
  });

  console.log("🖨️ Opening USB printer...");

  device.open(error => {
    if (error) {
      console.error("❌ Failed to open USB printer:", error);
      return;
    }

    console.log("✅ USB printer connected");

    printer
      .align("CT")
      .style("B")
      .size(2, 2)
      .text("TEST PRINT")
      .size(1, 1)
      .style("NORMAL")
      .text("USB ESC/POS OK")
      .text("------------------------------")
      .align("LT")
      .text("1234567890")
      .text("abcdefghijklmnopqrstuvwxyz")
      .text(new Date().toLocaleString())
      .text("")
      .cut()
      .close(() => {
        console.log("✅ Print completed");
      });
  });
}

usbTestPrint();
