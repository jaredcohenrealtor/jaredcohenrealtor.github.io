// Builds the favicon set and the social share image from the sources in
// assets/_source/brand/ (made from internal/brand/*.html, see the comments there).
// Dev-only — run with: npm run brand
//
// Outputs:
//   /favicon.ico                                  (16 + 32 px, for browsers that ask for it)
//   assets/images/brand/favicon-32.png, favicon-192.png
//   assets/images/brand/apple-touch-icon.png      (180 px, square, no transparency)
//   assets/images/brand/og-image.jpg              (1200x630 share image)

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "assets/_source/brand");
const OUT = join(ROOT, "assets/images/brand");
const NAVY = "#0c0f24";
mkdirSync(OUT, { recursive: true });

const favicon = join(SRC, "favicon-512.png");

async function png(size, file, opts = {}) {
  let img = sharp(favicon).resize(size, size);
  if (opts.flatten) img = img.flatten({ background: NAVY });
  const buf = await img.png({ compressionLevel: 9 }).toBuffer();
  if (file) writeFileSync(join(OUT, file), buf);
  console.log(`  ${file || "(ico)"} ${size}x${size} ${(buf.length / 1024).toFixed(1)} KB`);
  return buf;
}

await png(32, "favicon-32.png");
await png(192, "favicon-192.png");
await png(180, "apple-touch-icon.png", { flatten: true });

// favicon.ico: an ICO container holding PNG images (supported by all modern browsers)
const images = [await png(16), await png(32)];
const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(0, 0);             // reserved
header.writeUInt16LE(1, 2);             // type: icon
header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach((buf, i) => {
  const size = i === 0 ? 16 : 32;
  const e = 6 + 16 * i;
  header.writeUInt8(size, e);           // width
  header.writeUInt8(size, e + 1);       // height
  header.writeUInt8(0, e + 2);          // palette
  header.writeUInt8(0, e + 3);          // reserved
  header.writeUInt16LE(1, e + 4);       // color planes
  header.writeUInt16LE(32, e + 6);      // bits per pixel
  header.writeUInt32LE(buf.length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += buf.length;
});
writeFileSync(join(ROOT, "favicon.ico"), Buffer.concat([header, ...images]));
console.log("  /favicon.ico (16 + 32)");

const og = await sharp(join(SRC, "og-image.png"))
  .resize(1200, 630)
  .jpeg({ quality: 85, mozjpeg: true })
  .toFile(join(OUT, "og-image.jpg"));
console.log(`  og-image.jpg ${og.width}x${og.height} ${(og.size / 1024).toFixed(0)} KB`);
