// Validates the site's HTML with html-validate (rules in .htmlvalidate.json).
// Dev-only.
//   npm run validate                 -> every .html file in the site
//   node scripts/validate.mjs a.html -> just those files
//   node scripts/validate.mjs --hook -> Claude Code PostToolUse hook: reads the
//       hook JSON on stdin, validates the edited file if it's .html, and exits 2
//       with the problems on stderr so they're fed back to Claude.

import { readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FileSystemConfigLoader, HtmlValidate, formatterFactory } from "html-validate";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_DIRS = new Set(["node_modules", ".git", ".claude", "docs", "_source", "scripts"]);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (name.endsWith(".html")) yield full;
  }
}

async function readStdin() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

const hookMode = process.argv.includes("--hook");
let files;

if (hookMode) {
  let filePath;
  try {
    const input = JSON.parse(await readStdin());
    filePath = input?.tool_input?.file_path;
  } catch {
    process.exit(0); // not our business if the hook payload is unreadable
  }
  if (!filePath || !filePath.toLowerCase().endsWith(".html")) process.exit(0);
  const abs = resolve(filePath);
  const rel = relative(ROOT, abs);
  if (rel.startsWith("..") || [...SKIP_DIRS].some((d) => rel.split(/[\\/]/).includes(d))) process.exit(0);
  files = [abs];
} else {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  files = args.length ? args.map((f) => resolve(f)) : [...walk(ROOT)];
}

const htmlvalidate = new HtmlValidate(new FileSystemConfigLoader());
const reports = [];
for (const file of files) reports.push(await htmlvalidate.validateFile(file));
const results = reports.flatMap((r) => r.results);
const errorCount = results.reduce((n, r) => n + r.errorCount, 0);

if (results.length) {
  const output = formatterFactory("stylish")(results);
  (hookMode ? process.stderr : process.stdout).write(output + "\n");
}

if (!hookMode) console.log(`Validated ${files.length} file(s): ${errorCount} error(s).`);
process.exit(errorCount ? (hookMode ? 2 : 1) : 0);
