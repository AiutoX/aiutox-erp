/**
 * External feature linker — discovers @aiutox/module-* npm packages and creates
 * symlinks (Unix) or directory junctions (Windows) into app/features/.
 *
 * Run as postinstall hook or manually:
 *   npx tsx scripts/link-external-features.ts
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, "..");
const FEATURES_DIR = path.join(FRONTEND_ROOT, "app", "features");
const NODE_MODULES_DIR = path.join(FRONTEND_ROOT, "node_modules");
const AIUTOX_SCOPE = "@aiutox";
const MODULE_PREFIX = "module-";

const isWindows = process.platform === "win32";

interface LinkResult {
  linked: string[];
  unlinked: string[];
  skipped: string[];
  errors: string[];
}

function isSymlinkOrJunction(targetPath: string): boolean {
  try {
    const stats = fs.lstatSync(targetPath);
    if (stats.isSymbolicLink()) {
      return true;
    }
    if (isWindows && stats.isDirectory()) {
      const real = fs.realpathSync(targetPath);
      return real !== path.resolve(targetPath);
    }
    return false;
  } catch {
    return false;
  }
}

function createLink(target: string, linkPath: string): void {
  if (isWindows) {
    execSync(`mklink /J "${linkPath}" "${target}"`, { stdio: "ignore" });
  } else {
    fs.symlinkSync(target, linkPath, "dir");
  }
}

function removeLink(linkPath: string): void {
  if (isWindows) {
    execSync(`rmdir "${linkPath}"`, { stdio: "ignore" });
  } else {
    fs.unlinkSync(linkPath);
  }
}

function discoverAiutoxModules(): Map<string, string> {
  const modules = new Map<string, string>();
  const scopeDir = path.join(NODE_MODULES_DIR, AIUTOX_SCOPE);

  if (!fs.existsSync(scopeDir)) {
    return modules;
  }

  for (const entry of fs.readdirSync(scopeDir, { withFileTypes: true })) {
    if (!entry.name.startsWith(MODULE_PREFIX)) {
      continue;
    }

    const featureName = entry.name.slice(MODULE_PREFIX.length).replace(/-/g, "_");
    const packageDir = path.join(scopeDir, entry.name);
    const featureSourceDir = path.join(packageDir, "app", "features", featureName);

    if (!fs.existsSync(featureSourceDir)) {
      continue;
    }

    const resolved = path.resolve(featureSourceDir);
    if (!resolved.startsWith(path.resolve(NODE_MODULES_DIR))) {
      console.warn(`[link-external-features] Skipping ${entry.name}: path traversal detected`);
      continue;
    }

    modules.set(featureName, resolved);
  }

  return modules;
}

function cleanStaleLinks(): string[] {
  const unlinked: string[] = [];

  if (!fs.existsSync(FEATURES_DIR)) {
    return unlinked;
  }

  for (const entry of fs.readdirSync(FEATURES_DIR, { withFileTypes: true })) {
    const featurePath = path.join(FEATURES_DIR, entry.name);

    if (!isSymlinkOrJunction(featurePath)) {
      continue;
    }

    try {
      const target = fs.readlinkSync(featurePath);
      const resolvedTarget = path.resolve(path.dirname(featurePath), target);
      if (!fs.existsSync(resolvedTarget)) {
        removeLink(featurePath);
        unlinked.push(entry.name);
      }
    } catch {
      removeLink(featurePath);
      unlinked.push(entry.name);
    }
  }

  return unlinked;
}

function linkExternalFeatures(): LinkResult {
  const result: LinkResult = { linked: [], unlinked: [], skipped: [], errors: [] };

  result.unlinked = cleanStaleLinks();

  const modules = discoverAiutoxModules();

  for (const [featureName, sourcePath] of modules) {
    const targetPath = path.join(FEATURES_DIR, featureName);

    if (fs.existsSync(targetPath)) {
      if (isSymlinkOrJunction(targetPath)) {
        try {
          const existingTarget = fs.readlinkSync(targetPath);
          const resolvedExisting = path.resolve(path.dirname(targetPath), existingTarget);
          if (resolvedExisting === sourcePath) {
            result.skipped.push(featureName);
            continue;
          }
          removeLink(targetPath);
        } catch {
          result.skipped.push(featureName);
          continue;
        }
      } else {
        console.warn(
          `[link-external-features] ${featureName}: real directory exists, skipping (built-in module)`
        );
        result.skipped.push(featureName);
        continue;
      }
    }

    try {
      createLink(sourcePath, targetPath);
      result.linked.push(featureName);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[link-external-features] Failed to link ${featureName}: ${msg}`);
      result.errors.push(featureName);
    }
  }

  return result;
}

const result = linkExternalFeatures();

console.log("[link-external-features] Done.");
if (result.linked.length) {
  console.log(`  Linked: ${result.linked.join(", ")}`);
}
if (result.unlinked.length) {
  console.log(`  Cleaned stale: ${result.unlinked.join(", ")}`);
}
if (result.skipped.length) {
  console.log(`  Skipped: ${result.skipped.join(", ")}`);
}
if (result.errors.length) {
  console.error(`  Errors: ${result.errors.join(", ")}`);
  process.exit(1);
}
