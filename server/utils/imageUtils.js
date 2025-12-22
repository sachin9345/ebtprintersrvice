const path = require("path");
const fs = require("fs");
const { createCanvas, loadImage, registerFont } = require("canvas");
const { app } = require("electron");

/* ================= PATHS ================= */

const FONT_DIR = app.isPackaged
  ? path.join(process.resourcesPath, "fonts")
  : path.join(__dirname, "..", "fonts");

const CACHE_DIR = path.join(app.getPath("userData"), "img-cache");

/* ================= INIT ================= */

if (!fs.existsSync(FONT_DIR)) {
  console.error("❌ FONT DIRECTORY NOT FOUND:", FONT_DIR);
  throw new Error("Font directory missing");
}

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/* ================= FONT REGISTER ================= */

registerFont(path.join(FONT_DIR, "NotoSans-Regular.ttf"), {
  family: "NotoSans",
  weight: "normal",
});

registerFont(path.join(FONT_DIR, "NotoSansTamil-Regular.ttf"), {
  family: "NotoSansTamil",
  weight: "normal",
});

console.log("✅ Fonts registered:", FONT_DIR);

/* ================= CACHE ================= */

const textImageCache = new Map();

/* ================= FUNCTIONS ================= */

/**
 * Render Tamil / Unicode text into image buffer
 */
async function textToImage(text, width = 560, fontSize = 26) {
  if (!text) return null;

  if (textImageCache.has(text)) {
    return textImageCache.get(text);
  }

  const canvas = createCanvas(width, fontSize + 20);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#000";
  ctx.font = `${fontSize}px "NotoSansTamil"`;
  ctx.textBaseline = "top";

  ctx.fillText(text, 0, 0);

  const buffer = canvas.toBuffer("image/png");
  textImageCache.set(text, buffer);
  return buffer;
}

/**
 * Resize and convert logo to printer-ready image
 */
async function logoFromFile(filePath, width = 560) {
  const img = await loadImage(filePath);
  const ratio = img.height / img.width;

  const canvas = createCanvas(width, Math.floor(width * ratio));
  const ctx = canvas.getContext("2d");

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toBuffer("image/png");
}

module.exports = {
  textToImage,
  logoFromFile,
};
