// Converts original images in assets/_source/ into resized WebP files the
// site actually serves. Dev-only — run with: npm run images
//
// To add an image: drop the original in assets/_source/, add a line to JOBS,
// and run `npm run images`. Outputs are named <name>-<width>.webp.
// Existing outputs are skipped unless the source is newer (use --force to redo all).

import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const JOBS = [
  // Headshot on its original background — About page, cards.
  { src: "_source/headshots/headshot-background.png", out: "images/headshots/headshot", widths: [400, 800, 1200] },
  // Transparent-background headshot — for placing over brand-colored sections.
  { src: "_source/headshots/headshot-transparent.png", out: "images/headshots/headshot-transparent", widths: [400, 800, 1200] },
  // Footer team/brokerage logo (white background).
  { src: "_source/logos/castles-unlimited-brokered-by-exp.jpg", out: "images/logos/castles-unlimited-brokered-by-exp", widths: [300, 600] }
];

const QUALITY = 80;
const force = process.argv.includes("--force");

for (const job of JOBS) {
  const srcPath = join(ROOT, "assets", job.src);
  if (!existsSync(srcPath)) {
    console.warn(`! missing source: assets/${job.src}`);
    continue;
  }
  const srcTime = statSync(srcPath).mtimeMs;

  for (const width of job.widths) {
    const outPath = join(ROOT, "assets", `${job.out}-${width}.webp`);
    if (!force && existsSync(outPath) && statSync(outPath).mtimeMs > srcTime) {
      console.log(`  skip  assets/${job.out}-${width}.webp (up to date)`);
      continue;
    }
    mkdirSync(dirname(outPath), { recursive: true });
    const info = await sharp(srcPath)
      .rotate() // respect EXIF orientation
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: QUALITY, alphaQuality: 90, effort: 6 })
      .toFile(outPath);
    console.log(`  wrote assets/${job.out}-${width}.webp  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
  }
}
