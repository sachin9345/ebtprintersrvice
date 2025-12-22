const { autoUpdater, AppUpdater } = require("electron-updater");
const { app } = require("electron");
const { log, logError } = require("../server/utils/logger");

// REQUIRED for background apps (tray apps)
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowDowngrade = false;

// Logs
autoUpdater.on("checking-for-update", () =>
  log("🔄 Checking for updates")
);

autoUpdater.on("update-available", info =>
  log(`⬆️ Update available: ${info.version}`)
);

autoUpdater.on("update-not-available", () =>
  log("✅ No update available")
);

autoUpdater.on("error", err =>
  logError("❌ Update error", err)
);

autoUpdater.on("download-progress", progress => {
  log(
    `⬇️ Downloading update: ${Math.round(progress.percent)}%`
  );
});

autoUpdater.on("update-downloaded", () => {
  log("✅ Update downloaded — will install on app quit");
});

/**
 * Call this ONLY after app is ready
 */
function checkUpdates() {
  try {
    autoUpdater.checkForUpdates();
  } catch (err) {
    logError("Update check failed", err);
  }
}

module.exports = { checkUpdates };
