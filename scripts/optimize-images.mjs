// Converts original images in assets/_source/ into resized WebP files the
// site actually serves. Dev-only — run with: npm run images
//
// To add an image: drop the original in assets/_source/, add a line to JOBS,
// and run `npm run images`. Outputs are named <name>-<width>.webp.
// Optional per-job settings: quality (default 80), and crop: { left, top,
// width, height } as fractions of the photo (e.g. to frame a person tighter).
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
  { src: "_source/logos/castles-unlimited-brokered-by-exp.jpg", out: "images/logos/castles-unlimited-brokered-by-exp", widths: [300, 600] },
  // Official HUD Equal Housing Opportunity logo (hud.gov/contactus/hudgraphics, fheo100.tif)
  { src: "_source/legal/equal-housing-opportunity-hud-1in.tif", out: "images/legal/equal-housing-opportunity", widths: [64, 128] },

  // Photos of Jared (owner's own shoot, 2026-10). Shown in arch frames and photo cards.
  { src: "_source/imagesOfMe/IMG_9931.jpg", out: "images/photos/jared-living-room", widths: [400, 800, 1200] },
  { src: "_source/imagesOfMe/IMG_9883.jpg", out: "images/photos/jared-kitchen", widths: [400, 800, 1200], crop: { left: 0.24, top: 0.31, width: 0.597, height: 0.56 } },
  { src: "_source/imagesOfMe/IMG_9891.jpg", out: "images/photos/jared-staircase", widths: [400, 800, 1200] },
  { src: "_source/imagesOfMe/IMG_9887.jpg", out: "images/photos/jared-welcome", widths: [400, 800, 1200], crop: { left: 0.115, top: 0.31, width: 0.62, height: 0.581 } },
  { src: "_source/imagesOfMe/IMG_9892.jpg", out: "images/photos/jared-desk", widths: [400, 800, 1200] },
  { src: "_source/imagesOfMe/IMG_9896.jpg", out: "images/photos/jared-desk-signing", widths: [400, 800, 1200] },
  { src: "_source/imagesOfMe/IMG_9903.jpg", out: "images/photos/jared-front-door", widths: [400, 800, 1200], quality: 68 },
  { src: "_source/imagesOfMe/IMG_9909.jpg", out: "images/photos/jared-brick-house", widths: [400, 800, 1200], quality: 68 },
  { src: "_source/imagesOfMe/IMG_9932.jpg", out: "images/photos/jared-folder", widths: [400, 800, 1200] },
  // Transparent cut-outs of Jared (for colored panels: 404 page, homepage About band, footer CTA)
  { src: "_source/imagesOfMe/IMG_9887.jpg - Edited.png", out: "images/photos/jared-cutout-welcome", widths: [400, 800] },
  { src: "_source/imagesOfMe/IMG_9939.jpg - Edited.png", out: "images/photos/jared-cutout-folder", widths: [400, 800] },

  // Places. "stock-" = free Pexels photo (pexels.com/photo/<id>, id = last number in the
  // source name). MOOD ONLY: never captioned as a listing, a sale, or a town, unless the
  // photo itself proves the place (Newton Centre station's sign does). See decisions.md.
  { src: "_source/imagesOfProperties/IMG_9916.jpg", out: "images/places/staged-living-room", widths: [640, 1280, 1920], quality: 72 },
  { src: "_source/imagesOfProperties/IMG_9914.jpg", out: "images/places/staged-kitchen-panorama", widths: [800, 1600, 2400], quality: 68 },
  { src: "_source/imagesOfProperties/pexels-philevenphotos-15914833.jpg", out: "images/places/stock-newton-centre-station", widths: [400, 800], quality: 72 }, // Newton Centre, MA (sign in frame)
  { src: "_source/imagesOfProperties/pexels-gene-samit-546626702-34793388.jpg", out: "images/places/stock-colonial-autumn", widths: [400, 800, 1200], quality: 72 }, // Doylestown, PA: never label it a MA town
  { src: "_source/imagesOfProperties/pexels-banx-photography-283688202-34933247.jpg", out: "images/places/stock-white-colonial", widths: [640, 1280], quality: 72 } // Salem, MA: not in the service area
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
    // Optional crop: { left, top, width, height } as fractions of the (upright) photo
    let input = srcPath;
    if (job.crop) {
      const upright = await sharp(srcPath).rotate().toBuffer({ resolveWithObject: true });
      const { width: W, height: H } = upright.info;
      input = await sharp(upright.data).extract({
        left: Math.round(job.crop.left * W),
        top: Math.round(job.crop.top * H),
        width: Math.round(job.crop.width * W),
        height: Math.round(job.crop.height * H)
      }).toBuffer();
    }
    const info = await sharp(input)
      .rotate() // respect EXIF orientation
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: job.quality ?? QUALITY, alphaQuality: 90, effort: 6 })
      .toFile(outPath);
    console.log(`  wrote assets/${job.out}-${width}.webp  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
  }
}
