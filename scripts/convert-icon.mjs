// convert-icon.mjs - converts SVG to PNG sizes needed for Electron .ico
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svgPath = path.join(__dirname, "../Icon/App Icon.svg");
const outDir = path.join(__dirname, "../build-assets");

fs.mkdirSync(outDir, { recursive: true });

// Generate 256x256 PNG (electron-builder uses this as the icon)
const pngPath = path.join(outDir, "icon.png");
await sharp(svgPath)
  .resize(256, 256)
  .png()
  .toFile(pngPath);

console.log("✓ Created", pngPath);

// Also create 512x512 for higher-res contexts
const png512 = path.join(outDir, "icon@2x.png");
await sharp(svgPath)
  .resize(512, 512)
  .png()
  .toFile(png512);

console.log("✓ Created", png512);
console.log("Done! Use build-assets/icon.png as the electron-builder icon.");
