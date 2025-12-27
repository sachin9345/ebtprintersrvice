const { BrowserWindow, ipcMain } = require("electron");
const path = require("path");

function openIpPrompt(parent) {
  return new Promise(resolve => {
    const win = new BrowserWindow({
      width: 360,
      height: 180,
      parent,
      modal: true,
      resizable: false,
      minimizable: false,
      maximizable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    win.loadURL(`data:text/html;charset=utf-8,
      <html>
        <body style="font-family:sans-serif;padding:20px">
          <h3>Add Network Printer</h3>
          <p>Enter printer IP (port 9100)</p>
          <input id="ip" placeholder="192.168.1.51"
            style="width:100%;padding:8px;font-size:14px"/>
          <div style="margin-top:15px;text-align:right">
            <button onclick="cancel()">Cancel</button>
            <button onclick="submit()">Add</button>
          </div>

          <script>
            const { ipcRenderer } = require("electron");
            function submit() {
              const ip = document.getElementById("ip").value;
              ipcRenderer.send("ip-submit", ip);
            }
            function cancel() {
              ipcRenderer.send("ip-submit", null);
            }
          </script>
        </body>
      </html>
    `);

    ipcMain.once("ip-submit", (_, value) => {
      win.close();
      resolve(value);
    });
  });
}

module.exports = { openIpPrompt };
