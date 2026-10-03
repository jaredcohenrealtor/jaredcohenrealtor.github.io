// Switches the site's domain everywhere it's written as an absolute URL
// (canonical tags, og:url/og:image, JSON-LD, sitemap.xml, robots.txt) and
// creates/removes the CNAME file. Dev-only — run with: npm run set-domain
//
// To change domains:
//   1. Edit "domain" in site.config.json (e.g. "https://www.example.com", no trailing slash)
//   2. Run `npm run set-domain`
//   3. Add the new domain to the Cloudflare Worker's ALLOWED_ORIGINS
//
// "appliedDomain" records what's currently written in the files — don't edit it by hand.
// Use --dry-run to preview without changing anything.

import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = join(ROOT, "site.config.json");
const SKIP_DIRS = new Set(["node_modules", ".git", ".claude", "docs", "_source", "scripts"]);
const EXTENSIONS = [".html", ".xml", ".txt"];
const dryRun = process.argv.includes("--dry-run");

const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
const next = config.domain.replace(/\/+$/, "");
const prev = (config.appliedDomain || next).replace(/\/+$/, "");

if (!/^https?:\/\/[^/\s]+$/.test(next)) {
  console.error(`"domain" must look like https://www.example.com (got "${config.domain}")`);
  process.exit(1);
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (EXTENSIONS.some((ext) => name.endsWith(ext))) yield full;
  }
}

let changedFiles = 0;
if (prev !== next) {
  for (const file of walk(ROOT)) {
    const text = readFileSync(file, "utf8");
    if (!text.includes(prev)) continue;
    const count = text.split(prev).length - 1;
    console.log(`  ${relative(ROOT, file)}: ${count} URL(s)`);
    if (!dryRun) writeFileSync(file, text.split(prev).join(next));
    changedFiles++;
  }
}

// CNAME: only for custom domains (GitHub Pages' own *.github.io needs none).
const host = new URL(next).host;
const cnamePath = join(ROOT, "CNAME");
if (host.endsWith(".github.io")) {
  if (existsSync(cnamePath)) {
    console.log("  removing CNAME (back on github.io)");
    if (!dryRun) rmSync(cnamePath);
  }
} else {
  console.log(`  CNAME -> ${host}`);
  if (!dryRun) writeFileSync(cnamePath, host + "\n");
}

if (!dryRun) {
  config.appliedDomain = next;
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
}

console.log(
  prev === next
    ? `Domain already applied: ${next}`
    : `${dryRun ? "[dry run] would update" : "Updated"} ${changedFiles} file(s): ${prev} -> ${next}`
);
if (prev !== next && !dryRun) {
  console.log("Reminder: add the new domain to ALLOWED_ORIGINS in the Cloudflare Worker.");
}
