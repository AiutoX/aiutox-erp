/**
 * Copyright (c) AiutoX. All rights reserved.
 *
 * Types for check-isolation.mjs, so the vitest suite can import it under strict tsc.
 */
export type IsolationRule =
  "cross-feature" | "shared-to-feature" | "i18n-index";

export interface SourceFile {
  path: string;
  source: string;
}

export interface Violation {
  from: string;
  import: string;
  rule: IsolationRule;
}

export interface AllowlistEntry extends Violation {
  reason: string;
}

export interface Allowlist {
  version: number;
  max_entries: number;
  entries: AllowlistEntry[];
}

export interface IsolationReport {
  violations: Violation[];
  staleEntries: AllowlistEntry[];
  overLimit: { entries: number; max: number } | null;
}

export function findViolations(input: {
  files: SourceFile[];
  allowlist: Allowlist;
}): IsolationReport;

export function loadFiles(root: string): SourceFile[];
