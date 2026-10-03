// Checks that text which must stay word-for-word still matches its source,
// and that no HTML comment is left unclosed. Dev-only. Run with:
//   npm run check:verbatim
//
// Sources live in docs/ (gitignored, local only). If a source file is missing,
// that check is skipped with a note rather than failing.
//
// Checks:
//   1. Embeds: every <iframe>/<script> line in docs/boldtrail-embeds.md and
//      docs/instagram-feed.md appears on listings.html / index.html. The only
//      allowed additions are title="…" and loading="lazy" (owner-approved).
//   2. Analytics: every code line of docs/analytics.md appears exactly once on
//      every page except styleguide.html.
//   3. Consent text: each form's consent label equals docs/consent-text.md.
//   4. Legal text: fair-housing.html, privacy.html and the footer's MLSPIN block
//      match docs/legal/*.md (accessibility.html: everything but the phone number,
//      which the owner changed on purpose).
//   5. No unclosed <!-- comments in any page or partial. (An unclosed comment once
//      hid the whole privacy policy, and html-validate does not catch it.)

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const has = (p) => existsSync(join(ROOT, p));
const pages = readdirSync(ROOT).filter((f) => f.endsWith(".html"))
  .concat(readdirSync(join(ROOT, "guides")).filter((f) => f.endsWith(".html")).map((f) => "guides/" + f));

let failures = 0;
const ok = (msg) => console.log("  ok    " + msg);
const fail = (msg) => { failures++; console.log("  FAIL  " + msg); };
const skip = (msg) => console.log("  skip  " + msg);

const decode = (s) => s.replace(/&#8209;/g, "-").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
const text = (html) => decode(html.replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const mdBody = (md) => text(md.replace(/<!--[\s\S]*?-->/g, "").split(/^---$/m).slice(1).join(" ")
  .replace(/^#+ .*$/gm, "").replace(/\*\*|\[|\]\([^)]*\)/g, ""));

// 1. Embeds --------------------------------------------------------------
console.log("Embeds");
if (has("docs/boldtrail-embeds.md") && has("docs/instagram-feed.md")) {
  const doc = read("docs/boldtrail-embeds.md") + "\n" + read("docs/instagram-feed.md");
  const site = (read("listings.html") + read("index.html"))
    .replace(/ title="(Property search|Home value estimate)"/g, "")
    .replace(/ loading="lazy"(?=[^<]*<\/iframe>)/g, "");
  for (const line of doc.split("\n").map((l) => l.trim()).filter((l) => /<(iframe|script)/.test(l))) {
    site.includes(line) ? ok(line.slice(0, 70)) : fail("not verbatim: " + line.slice(0, 70));
  }
} else skip("docs/boldtrail-embeds.md or docs/instagram-feed.md missing");

// 2. Analytics -----------------------------------------------------------
console.log("Analytics");
if (has("docs/analytics.md")) {
  const lines = read("docs/analytics.md").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("<!--"));
  let bad = 0;
  for (const p of pages.filter((f) => f !== "styleguide.html")) {
    const body = read(p).split("\n").map((l) => l.trim());
    for (const l of lines) if (!body.includes(l)) { bad++; fail(`${p}: missing "${l.slice(0, 50)}"`); }
    const html = read(p);
    if ((html.match(/clarity\.ms\/tag/g) || []).length !== 1 || (html.match(/cloudflareinsights/g) || []).length !== 1) {
      bad++; fail(`${p}: each snippet should appear exactly once`);
    }
  }
  if (!bad) ok(`both snippets verbatim, once each, on ${pages.length - 1} pages`);
} else skip("docs/analytics.md missing");

// 3. Consent text --------------------------------------------------------
console.log("Consent text");
if (has("docs/consent-text.md")) {
  const src = text(read("docs/consent-text.md"));
  // styleguide.html shows a demo checkbox with placeholder text on purpose
  for (const p of pages.filter((f) => f !== "styleguide.html")) {
    const m = read(p).match(/<label class="checkbox__label" for="[^"]*consent[^"]*">([\s\S]*?)<\/label>/);
    if (!m) continue;
    text(m[1]) === src ? ok(p) : fail(`${p}: consent label differs from docs/consent-text.md`);
  }
} else skip("docs/consent-text.md missing");

// 4. Legal text ----------------------------------------------------------
console.log("Legal text");
const legal = [
  ["docs/legal/fair-housing.md", "fair-housing.html", /Broker review required before launch\. -->([\s\S]*?)<img/],
  ["docs/legal/privacy.md", "privacy.html", /clearly marked section\. -->([\s\S]*?)<!-- SITE ADDITION/]
];
for (const [src, page, re] of legal) {
  if (!has(src)) { skip(src + " missing"); continue; }
  const m = read(page).match(re);
  if (!m) { fail(`${page}: couldn't find the legal block (markers changed?)`); continue; }
  text(m[1]) === mdBody(read(src)) ? ok(page) : fail(`${page}: differs from ${src}`);
}
if (has("docs/legal/accessibility.md")) {
  const src = mdBody(read("docs/legal/accessibility.md")).replace(/ --- /, " ").replace("617-658-3035", "617-733-8280");
  const m = read("accessibility.html").match(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/);
  m && text(m[1]).replace(/ \./g, ".") === src.replace(/ \./g, ".") ? ok("accessibility.html (owner-approved phone change only)")
    : fail("accessibility.html: differs from docs/legal/accessibility.md");
} else skip("docs/legal/accessibility.md missing");
if (has("docs/legal/mls-disclaimer.md")) {
  const src = mdBody(read("docs/legal/mls-disclaimer.md")).split("Other MLS boards")[0].replace(/ Last Update:.*$/, "").trim();
  const m = read("partials/footer.html").match(/<div class="mls-disclaimer">\s*<h2[^>]*>[^<]*<\/h2>([\s\S]*?)<\/div>/);
  m && text(m[1]) === src ? ok("footer MLSPIN disclaimer (timestamp omitted by owner choice)")
    : fail("partials/footer.html: MLSPIN disclaimer differs from docs/legal/mls-disclaimer.md");
} else skip("docs/legal/mls-disclaimer.md missing");

// 5. Unclosed comments ---------------------------------------------------
console.log("HTML comments");
let unclosed = 0;
for (const p of pages.concat(["partials/header.html", "partials/footer.html"])) {
  const h = read(p);
  let i = 0;
  while ((i = h.indexOf("<!--", i)) !== -1) {
    const end = h.indexOf("-->", i + 4);
    const next = h.indexOf("<!--", i + 4);
    if (end === -1 || (next !== -1 && next < end)) { unclosed++; fail(`${p}: unclosed <!-- near character ${i}`); break; }
    i = end + 3;
  }
}
if (!unclosed) ok("no unclosed comments");

console.log(failures ? `\n${failures} problem(s) found.` : "\nAll verbatim checks passed.");
process.exit(failures ? 1 : 0);
