#!/usr/bin/env bun
/**
 * Build script that compiles the bootstrapper into a single .exe
 * Run: bun run installer/build-installer.ts
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dir, "..");
const OUT_DIR = join(ROOT, "release");
const OUT_FILE = join(OUT_DIR, "NovaCode-Setup.exe");

console.log("Building NovaCode Installer...\n");

// Ensure output directory
if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
}

// Compile bootstrap.ts to a single .exe using Bun
console.log("Compiling bootstrap.ts → NovaCode-Setup.exe...");

try {
  execSync(
    `bun build --compile --target=bun-windows-x64 --outfile="${OUT_FILE}" installer/bootstrap.ts`,
    { cwd: ROOT, stdio: "inherit" }
  );

  if (existsSync(OUT_FILE)) {
    const stats = require("fs").statSync(OUT_FILE);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
    console.log(`\n✅ Success! NovaCode-Setup.exe (${sizeMB} MB)`);
    console.log(`   Location: ${OUT_FILE}`);
    console.log(`\n   Users can download and run this single .exe to install NovaCode.`);
  } else {
    console.error("❌ Build failed: output file not created");
    process.exit(1);
  }
} catch (err) {
  console.error("❌ Build failed:", err);
  process.exit(1);
}
