#!/usr/bin/env node
// pnpm doctor: checks the things that usually stop LedgerLoop from starting. Plain Node, any OS.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
let ok = true;
const report = (pass, label, hint = "") => {
  if (!pass) ok = false;
  console.log(`${pass ? "ok  " : "FIX "} ${label}${!pass && hint ? `\n     ${hint}` : ""}`);
};

const major = Number(process.versions.node.split(".")[0]);
report(major >= 26, `Node ${process.versions.node}`, "Install Node.js 26 or later from nodejs.org.");

const pnpm = spawnSync("pnpm", ["--version"], { encoding: "utf8", shell: process.platform === "win32" });
const pnpmVersion = pnpm.stdout?.trim();
report(Number(pnpmVersion?.split(".")[0]) >= 11, `pnpm ${pnpmVersion || "not found"}`, "Run: npm install -g pnpm@11 (or corepack enable).");

report(existsSync(path.join(root, "node_modules")), "dependencies installed", "Run: pnpm i");

const tags = spawnSync("git", ["tag", "--list", "t*-base"], { cwd: root, encoding: "utf8" }).stdout?.trim();
report(Boolean(tags), `base tags: ${tags ? tags.split(/\s+/).join(", ") : "none"}`, "Run: git fetch --tags");

const free = (port) =>
  new Promise((resolve) => {
    const server = net.createServer().once("error", () => resolve(false));
    server.listen(port, () => server.close(() => resolve(true)));
  });
for (const [port, what] of [[5100, "API"], [5173, "dashboard"], [5174, "checkout"]]) {
  report(await free(port), `port ${port} free (${what})`, `Something else is using ${port}. Stop it, or stop an earlier pnpm dev.`);
}
process.exit(ok ? 0 : 1);
