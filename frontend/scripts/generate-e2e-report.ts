/**
 * generate-e2e-report.ts
 * Reads e2e-registry.json and writes docs/05-status/e2e-coverage.md.
 *
 * Usage: npx tsx scripts/generate-e2e-report.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REGISTRY_PATH = path.resolve(__dirname, '../app/__tests__/e2e/e2e-registry.json');
const OUTPUT_PATH   = path.resolve(__dirname, '../../docs/05-status/e2e-coverage.md');

interface RouteEntry {
  path: string;
  spec: string | null;
  status: 'covered' | 'partial' | 'none' | 'needs-refresh';
}

interface ModuleEntry {
  module: string;
  layer: string;
  status: string;
  smoke_safe: boolean;
  last_codegen: string | null;
  test_dir: string;
  coverage: Record<string, string>;
  routes: RouteEntry[];
  known_gaps: string[];
  recommendations: string[];
}

interface Registry {
  version: string;
  generated_at: string;
  summary: {
    total_routes: number;
    covered_routes: number;
    coverage_pct: number;
  };
  modules: ModuleEntry[];
}

function coverageBadge(val: string | undefined): string {
  const map: Record<string, string> = {
    complete: 'complete',
    partial:  'partial',
    none:     'none',
    'needs-refresh': 'needs-refresh',
  };
  if (!val) return '-';
  return map[val] ?? val;
}

function statusEmoji(status: string): string {
  const map: Record<string, string> = {
    covered:       'covered',
    partial:       'partial',
    none:          'none',
    'needs-refresh': 'needs-refresh',
  };
  return map[status] ?? status;
}

function moduleStatusLabel(status: string): string {
  const map: Record<string, string> = {
    complete: 'COMPLETE',
    partial:  'partial',
    none:     'none',
    'needs-refresh': 'needs-refresh',
  };
  return map[status] ?? status;
}

function routeCoveredCount(routes: RouteEntry[]): number {
  return routes.filter(r => r.status === 'covered' || r.status === 'partial').length;
}

function generateReport(registry: Registry): string {
  const now = new Date().toISOString();
  const { summary, modules } = registry;

  const lines: string[] = [];

  lines.push('# E2E Coverage Report');
  lines.push('');
  lines.push(`Generated: ${now}`);
  lines.push(`Registry version: ${registry.version}`);
  lines.push('');
  lines.push('## Executive Summary');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| Total routes | ${summary.total_routes} |`);
  lines.push(`| Covered (full or partial) | ${summary.covered_routes} |`);
  lines.push(`| Coverage % | ${summary.coverage_pct}% |`);
  lines.push(`| Modules tracked | ${modules.length} |`);
  lines.push('');

  // Module summary table
  lines.push('## Module Summary');
  lines.push('');
  lines.push('| Module | Layer | Status | Routes | AC | CRUD | RBAC | Error | Smoke | Codegen |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|');

  for (const m of modules) {
    const covered = routeCoveredCount(m.routes);
    const total   = m.routes.length;
    const cov     = m.coverage;
    lines.push(
      `| ${m.module} | ${m.layer} | ${moduleStatusLabel(m.status)} | ${covered}/${total} | ${coverageBadge(cov.access_control)} | ${coverageBadge(cov.crud)} | ${coverageBadge(cov.rbac)} | ${coverageBadge(cov.error_cases)} | ${coverageBadge(cov.smoke)} | ${m.last_codegen ?? '-'} |`
    );
  }
  lines.push('');

  // Per-module route detail
  lines.push('## Route Coverage Detail');
  lines.push('');

  for (const m of modules) {
    lines.push(`### ${m.module} (${m.layer})`);
    lines.push('');
    lines.push('| Route | Spec | Status |');
    lines.push('|---|---|---|');
    for (const r of m.routes) {
      const spec = r.spec ?? '-';
      lines.push(`| \`${r.path}\` | ${spec} | ${statusEmoji(r.status)} |`);
    }
    lines.push('');

    if (m.known_gaps.length > 0) {
      lines.push('**Known gaps:**');
      for (const gap of m.known_gaps) {
        lines.push(`- ${gap}`);
      }
      lines.push('');
    }

    if (m.recommendations.length > 0) {
      lines.push('**Recommendations:**');
      for (const rec of m.recommendations) {
        lines.push(`- ${rec}`);
      }
      lines.push('');
    }
  }

  // Uncovered routes
  lines.push('## Uncovered Routes');
  lines.push('');
  lines.push('All routes with status = none (no spec at all):');
  lines.push('');

  const uncovered: Array<{ module: string; path: string }> = [];
  for (const m of modules) {
    for (const r of m.routes) {
      if (r.status === 'none') {
        uncovered.push({ module: m.module, path: r.path });
      }
    }
  }

  if (uncovered.length === 0) {
    lines.push('All routes have at least partial coverage.');
  } else {
    lines.push('| Module | Route |');
    lines.push('|---|---|');
    for (const u of uncovered) {
      lines.push(`| ${u.module} | \`${u.path}\` |`);
    }
  }
  lines.push('');

  // Prioritized backlog
  lines.push('## Prioritized Backlog');
  lines.push('');
  lines.push('Modules ranked by urgency: none > needs-refresh > partial, core before business:');
  lines.push('');

  const ranked = [...modules].sort((a, b) => {
    const order: Record<string, number> = { none: 0, 'needs-refresh': 1, partial: 2, complete: 3 };
    const layerOrder: Record<string, number> = { core: 0, business: 1 };
    const statusDiff = (order[a.status] ?? 99) - (order[b.status] ?? 99);
    if (statusDiff !== 0) return statusDiff;
    return (layerOrder[a.layer] ?? 99) - (layerOrder[b.layer] ?? 99);
  });

  let rank = 1;
  for (const m of ranked) {
    if (m.status === 'complete') continue;
    lines.push(`${rank}. **${m.module}** (${m.layer}, ${moduleStatusLabel(m.status)})`);
    if (m.recommendations.length > 0) {
      lines.push(`   - ${m.recommendations[0]}`);
    }
    rank++;
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`To regenerate: \`npx tsx scripts/generate-e2e-report.ts\``);

  return lines.join('\n');
}

const registry: Registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
const report = generateReport(registry);

const outputDir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(OUTPUT_PATH, report, 'utf-8');
console.log(`E2E coverage report written to ${OUTPUT_PATH}`);
console.log(`Coverage: ${registry.summary.covered_routes}/${registry.summary.total_routes} routes (${registry.summary.coverage_pct}%)`);
