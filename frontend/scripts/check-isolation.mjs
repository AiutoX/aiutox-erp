/**
 * Copyright (c) AiutoX. All rights reserved.
 *
 * Frontend isolation check (EH-009, DEC-20261020-003).
 *
 * Fails when:
 *   1. a file under app/features/<A>/ imports from features/<B> (B != A)
 *      -> rule "cross-feature";
 *   2. a file under app/lib, app/components, app/stores or app/hooks imports
 *      from features/ -> rule "shared-to-feature";
 *   3. app/lib/i18n/translations/index.ts imports from features/
 *      -> rule "i18n-index".
 *
 * Violations that exist today live in scripts/isolation-allowlist.json. The
 * allowlist can only shrink: an entry that no longer matches a real violation
 * is stale and fails the check, and more entries than `max_entries` fails it
 * too. The only allowed change to `max_entries` is lowering it.
 *
 * Usage (from the frontend directory):
 *   node scripts/check-isolation.mjs                     check, exit 1 on any problem
 *   node scripts/check-isolation.mjs --print-violations  print current violations as allowlist entries
 *   node scripts/check-isolation.mjs --root <dir>        check another tree (used by the tests)
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const FEATURES_PREFIX = "app/features/";
const I18N_INDEX = "app/lib/i18n/translations/index.ts";
const SHARED_DIRS = [
  "app/lib/",
  "app/components/",
  "app/stores/",
  "app/hooks/",
];
const SKIPPED_DIRS = new Set(["node_modules", "build", "dist", "__tests__"]);
const DEFAULT_REASON = "legacy, tracked by ISSUE-033";

const ALIAS_FEATURES = "~/features/";

function isExcluded(path) {
  const segments = path.split("/");
  const name = segments[segments.length - 1];
  if (segments.some((segment) => SKIPPED_DIRS.has(segment))) return true;
  return /\.(test|spec)\.[cm]?[jt]sx?$/.test(name) || name.endsWith(".d.ts");
}

/**
 * Blanks out comments and keeps string literals intact (specifiers are strings).
 * String-aware, so a "/*" inside a string (a glob) does not open a comment. Single
 * and double quoted strings end at a line break, which bounds the damage a regex
 * literal containing a quote can do to one line.
 */
function stripComments(source) {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === "/" && next === "/") {
      while (i < source.length && source[i] !== "\n") i++;
    } else if (ch === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end === -1 ? source.length : end + 2;
      out += " ";
    } else if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < source.length && source[j] !== ch) {
        if (source[j] === "\\") j++;
        else if (source[j] === "\n" && ch !== "`") break;
        j++;
      }
      out += source.slice(i, j + 1);
      i = j + 1;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

function extractSpecifiers(source) {
  const code = stripComments(source);
  const specifiers = [];
  const patterns = [
    /\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of code.matchAll(pattern)) {
      specifiers.push({ index: match.index, specifier: match[1] });
    }
  }
  return specifiers
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.specifier);
}

/** Feature name an import specifier points into, or null when it points elsewhere. */
function targetFeature(fromPath, specifier) {
  let resolved;
  if (specifier.startsWith(ALIAS_FEATURES)) {
    resolved = posix.normalize(`app/${specifier.slice(2)}`);
  } else if (specifier.startsWith(".")) {
    resolved = posix.join(posix.dirname(fromPath), specifier);
  } else {
    return null;
  }
  if (!resolved.startsWith(FEATURES_PREFIX)) return null;
  const name = resolved.slice(FEATURES_PREFIX.length).split("/")[0];
  return name || null;
}

function ruleFor(fromPath, target) {
  if (fromPath === I18N_INDEX) return "i18n-index";
  if (fromPath.startsWith(FEATURES_PREFIX)) {
    const own = fromPath.slice(FEATURES_PREFIX.length).split("/")[0];
    return own === target ? null : "cross-feature";
  }
  if (SHARED_DIRS.some((dir) => fromPath.startsWith(dir)))
    return "shared-to-feature";
  return null;
}

const entryKey = (entry) => `${entry.from}\u0000${entry.import}`;

/**
 * Pure: no filesystem. `files` are `{ path, source }` with paths relative to the
 * frontend root and forward slashes.
 *
 * Returns the violations that are not allowlisted, the allowlist entries that
 * match no real violation, and `overLimit` ({ entries, max }) when the
 * allowlist holds more than `max_entries` entries (otherwise null).
 */
export function findViolations({ files, allowlist }) {
  if (!Array.isArray(allowlist.entries)) {
    throw new Error("isolation allowlist: `entries` must be an array");
  }
  if (!Number.isInteger(allowlist.max_entries) || allowlist.max_entries < 0) {
    throw new Error(
      "isolation allowlist: `max_entries` must be a non-negative integer"
    );
  }
  const found = new Map();
  for (const file of files) {
    if (isExcluded(file.path)) continue;
    for (const specifier of extractSpecifiers(file.source)) {
      const target = targetFeature(file.path, specifier);
      if (target === null) continue;
      const rule = ruleFor(file.path, target);
      if (rule === null) continue;
      const violation = { from: file.path, import: specifier, rule };
      found.set(entryKey(violation), violation);
    }
  }

  const entries = allowlist.entries;
  const allowed = new Set(entries.map(entryKey));
  const violations = [...found.values()].filter(
    (v) => !allowed.has(entryKey(v))
  );
  const staleEntries = entries.filter((entry) => !found.has(entryKey(entry)));
  const overLimit =
    entries.length > allowlist.max_entries
      ? { entries: entries.length, max: allowlist.max_entries }
      : null;

  return { violations, staleEntries, overLimit };
}

function walk(dir, root, files) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    // External features are linked into app/features (link-external-features.ts);
    // they are not repository content, so links are not followed.
    if (entry.isSymbolicLink()) continue;
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) walk(abs, root, files);
    } else if (/\.tsx?$/.test(entry.name)) {
      const path = relative(root, abs).split("\\").join("/");
      if (!isExcluded(path))
        files.push({ path, source: readFileSync(abs, "utf8") });
    }
  }
  return files;
}

export function loadFiles(root) {
  const appDir = join(root, "app");
  return existsSync(appDir) ? walk(appDir, root, []) : [];
}

function parseArgs(argv, defaultRoot) {
  const options = { root: defaultRoot, printViolations: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--print-violations") options.printViolations = true;
    else if (argv[i] === "--root") options.root = resolve(argv[++i] ?? "");
  }
  return options;
}

function main() {
  const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const { root, printViolations } = parseArgs(
    process.argv.slice(2),
    defaultRoot
  );
  const allowlistPath = join(root, "scripts", "isolation-allowlist.json");
  const files = loadFiles(root);

  if (printViolations) {
    const { violations } = findViolations({
      files,
      allowlist: { version: 1, max_entries: 0, entries: [] },
    });
    process.stdout.write(
      `${JSON.stringify(
        violations.map((v) => ({ ...v, reason: DEFAULT_REASON })),
        null,
        2
      )}\n`
    );
    return 0;
  }

  const allowlist = JSON.parse(readFileSync(allowlistPath, "utf8"));
  const { violations, staleEntries, overLimit } = findViolations({
    files,
    allowlist,
  });
  const lines = [];

  for (const v of violations) {
    lines.push(`violation [${v.rule}] ${v.from} imports ${v.import}`);
  }
  for (const e of staleEntries) {
    lines.push(
      `stale allowlist entry [${e.rule}] ${e.from} imports ${e.import}: no longer a violation, remove it and lower max_entries`
    );
  }
  if (overLimit) {
    lines.push(
      `allowlist has ${overLimit.entries} entries, above max_entries ${overLimit.max}: the allowlist can only shrink`
    );
  }

  if (lines.length === 0) {
    process.stdout.write(
      `check-isolation: OK (${allowlist.entries.length} allowlisted legacy imports, max ${allowlist.max_entries})\n`
    );
    return 0;
  }
  process.stderr.write(`check-isolation: FAILED\n${lines.join("\n")}\n`);
  return 1;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(`check-isolation: FAILED\n${error.message}\n`);
    process.exitCode = 1;
  }
}
