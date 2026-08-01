#!/usr/bin/env node
/**
 * CI test wrapper: strips Jest-only flags (e.g. --watchAll=false)
 * before passing remaining args to vitest run.
 */
import { spawnSync } from "child_process";

const JEST_ONLY_FLAGS = ["--watchAll", "--watchAll=false", "--passWithNoTests"];

const args = process.argv.slice(2).filter((arg) => {
  return !JEST_ONLY_FLAGS.some(
    (flag) => arg === flag || arg.startsWith(`${flag}=`)
  );
});

const result = spawnSync(
  "npx",
  ["vitest", "run", "--passWithNoTests", ...args],
  { stdio: "inherit", shell: true }
);

process.exit(result.status ?? 1);
