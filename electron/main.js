const { app } = require("electron");
const path = require("path");
const { createTray } = require("./tray");
const { log, logError } = require("../server/utils/logger");


const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}


require(path.join(__dirname, "..", "server", "index.js"));

  


app.whenReady().then(() => {

 app.setLoginItemSettings({
  openAtLogin: true,
  openAsHidden: true,
  enabled: true,
  path: process.execPath,
  args: []
});
  createTray();
  log("🖨️ EBT Printer Service started");
  
});


app.on("window-all-closed", event => {
  event.preventDefault();
});


process.on("uncaughtException", logError);
process.on("unhandledRejection", logError);
