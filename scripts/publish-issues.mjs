#!/usr/bin/env node
// Creates the LedgerLoop labels and ticket issues on GitHub with the gh CLI.
//
//   node scripts/publish-issues.mjs --repo <owner>/ledgerloop            (dry run: prints commands)
//   node scripts/publish-issues.mjs --repo <owner>/ledgerloop --apply    (runs them)
//
// Labels come from .github/labels.json, issues from scripts/issues/<id>.md (front matter + body).
// Issues are created in ticket order so their numbers line up with the ticket ids only when the
// repository has exactly 39 issues or pull requests before them; otherwise the ticket id stays in
// the title. Push the tags and the pr/settlement-bank-credit branch before publishing #45.
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const repo = args[args.indexOf("--repo") + 1];
if (!args.includes("--repo") || !repo || repo.startsWith("--")) {
  console.error("Usage: node scripts/publish-issues.mjs --repo <owner>/<name> [--apply]");
  process.exit(2);
}

function gh(argv) {
  const shown = argv.map((a) => (/[\s"]/.test(a) ? JSON.stringify(a) : a)).join(" ");
  if (!apply) return console.log(`gh ${shown}`);
  const run = spawnSync("gh", argv, { stdio: "inherit", shell: false });
  if (run.status !== 0) throw new Error(`gh ${shown} failed`);
}

// Labels: one per family value, e.g. "stack:frontend", "tier:1".
const { families, descriptions } = JSON.parse(readFileSync(path.join(root, ".github/labels.json"), "utf8"));
for (const [family, { color, values }] of Object.entries(families)) {
  for (const value of values) {
    gh(["label", "create", `${family}:${value}`, "--repo", repo, "--color", color, "--description", descriptions[family], "--force"]);
  }
}

// Issues.
function parse(file) {
  const text = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  if (!match) throw new Error(`${file}: missing front matter`);
  const meta = {};
  for (const line of match[1].split("\n")) {
    const [, key, raw] = /^(\w+):\s*(.*)$/.exec(line) ?? [];
    if (!key) continue;
    meta[key] = raw.startsWith("[") ? raw.slice(1, -1).split(",").map((s) => s.trim()) : raw.replace(/^"|"$/g, "");
  }
  return { ...meta, body: `${match[2].trim()}\n\nBase tag: \`${meta.base_tag}\`` };
}

const dir = path.join(root, "scripts/issues");
const files = readdirSync(dir).filter((f) => /^\d+\.md$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b));
for (const file of files) {
  const issue = parse(path.join(dir, file));
  const argv = ["issue", "create", "--repo", repo, "--title", `#${parseInt(file)} ${issue.title}`, "--body", issue.body];
  for (const label of issue.labels) argv.push("--label", label);
  gh(argv);
}
if (!apply) console.log("\nDry run. Add --apply to create these on GitHub.");
