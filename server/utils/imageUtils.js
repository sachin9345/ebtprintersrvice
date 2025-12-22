const path = require("path");
const fs = require("fs");
const { createCanvas, loadImage, registerFont } = require("canvas");
const { app } = require("electron");


const FONT_DIR = app.isPackaged
  ? path.join(process.resourcesPath, "app.asar.unpacked", "server", "fonts")
  : path.join(__dirname, "..", "fonts");

console.log("📂 FONT DIR:", FONT_DIR);

if (!fs.existsSync(FONT_DIR)) {
  console.error("❌ FONT DIRECTORY NOT FOUND:", FONT_DIR);
  throw new Error("Font directory missing");
}

registerFont(path.join(FONT_DIR, "NotoSans-Regular.ttf"), {
  family: "NotoSans",
  weight: "normal",
});

registerFont(path.join(FONT_DIR, "NotoSansTamil-Regular.ttf"), {
  family: "NotoSansTamil",
  weight: "normal",
});

console.log("✅ Fonts registered successfully");

async function textToImage(text, width = 560, fontSize = 26) {
  const canvas = createCanvas(width, fontSize + 20);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#000";
  ctx.font = `${fontSize}px "NotoSansTamil"`;
  ctx.textBaseline = "top";

  ctx.fillText(text, 0, 0);
  return canvas.toBuffer();
}

async function logoFromFile(filePath, width = 560) {
  const img = await loadImage(filePath);
  const ratio = img.height / img.width;

  const canvas = createCanvas(width, Math.floor(width * ratio));
  const ctx = canvas.getContext("2d");

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toBuffer();
}

module.exports = { textToImage, logoFromFile };
