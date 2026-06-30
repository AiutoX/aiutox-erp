/**
 * Route generator — builds routes.ts from core routes + discovered business module routes.
 *
 * Business module routes are auto-discovered from each feature's `routes.config.ts` file.
 * If a feature directory is absent or has no routes.config.ts, its routes are skipped.
 *
 * Usage: npx tsx scripts/generate-routes.ts
 * Run before build or as a pre-build step.
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, "..");
const FEATURES_DIR = path.join(FRONTEND_ROOT, "app", "features");
const ROUTES_FILE = path.join(FRONTEND_ROOT, "app", "routes.ts");

interface RouteDefinition {
  path: string;
  file: string;
  children?: RouteDefinition[];
}

interface ModuleRoutesConfig {
  moduleKey: string;
  routes: RouteDefinition[];
}

const CORE_ROUTES_HEADER = `import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/login", "routes/login.tsx"),
  route("/forgot-password", "routes/forgot-password.tsx"),
  route("/reset-password", "routes/reset-password.tsx"),
  route("/verify-email", "routes/verify-email.tsx"),
  route("/maintenance", "routes/maintenance.tsx"),
  route("/unauthorized", "routes/unauthorized.tsx"),
  route("/dashboard", "routes/dashboard.tsx"),
  route("/users", "routes/users.tsx"),
  route("/users-create", "routes/users-create.tsx"),
  route("/users/:id", "routes/users.$id.tsx"),
  route("/users/:id/edit", "routes/users.$id.edit.tsx"),
  route("/users/:id/roles", "routes/users.$id.roles.tsx"),
  route("/users/:id/permissions", "routes/users.$id.permissions.tsx"),
  route("/profile", "routes/profile.tsx"),
  route("/settings", "routes/settings.tsx"),
  route("/files", "routes/files.tsx"),
  route("/calendar", "routes/calendar.tsx"),
  route("/tags-create", "routes/tags-create.tsx"),
  route("/calendar-create", "routes/calendar-create.tsx"),
  route("/templates-create", "routes/templates-create.tsx"),
  route("/integrations-create", "routes/integrations-create.tsx"),
  route("/automation-create", "routes/automation-create.tsx"),
  route("/search", "routes/search.tsx"),
  route("/activities", "routes/activities.tsx"),
  // Feature routes
  route("/tasks", "routes/tasks.tsx"),
  route("/tasks-create", "routes/tasks-create.tsx"),
  route("/tasks/settings", "routes/tasks.settings.tsx"),
  route("/tasks/status-customizer", "routes/tasks.status-customizer.tsx"),
  route("/tasks/webhooks", "routes/tasks.webhooks.tsx"),
  route("/tasks/:id", "routes/tasks.$id.tsx"),
  route("/tasks/:id/edit", "routes/tasks.$id.edit.tsx"),
  route("/approvals", "routes/approvals.tsx"),
  route("/approvals-create", "routes/approvals-create.tsx"),
  route("/approvals/:id", "routes/approvals.$id.tsx"),
  route("/approvals/flows/:id", "routes/approflows.$id.view.tsx"),
  route("/approvals/flows/:id/edit", "routes/approflows.$id.edit.tsx"),
  route("/automation", "routes/automation.tsx"),
  route("/automation/:id", "routes/automation.$id.tsx"),
  route("/automation/:id/edit", "routes/automation.$id.edit.tsx"),
  route("/pubsub", "routes/pubsub.tsx"),
  route("/pubsub/streams/:streamId", "routes/pubsub.streams.$streamId.tsx"),
  route("/pubsub/groups/:groupId", "routes/pubsub.groups.$groupId.tsx"),
  // Config routes
  route("/config/webhooks", "routes/config.webhooks.tsx"),
  route("/config/theme", "routes/config.theme.tsx"),
  route("/config/modules", "routes/config.modules.tsx"),
  route("/config/general", "routes/config.general.tsx"),
  route("/config/roles", "routes/config.roles.tsx"),
  route("/config/notifications", "routes/config.notifications.tsx"),
  route("/config/integrations", "routes/config.integrations.tsx"),
  route("/config/quick-actions", "routes/config.quick-actions.tsx"),
  route("/config/import-export", "routes/config.import-export.tsx"),
  route("/config/audit", "routes/config.audit.tsx"),
  route("/config/files", "routes/config.files.tsx"),
  route("/config/tenants", "routes/config.tenants.tsx"),
  route("/config/automation", "routes/config.automation.tsx"),
  route("/config/automation/analytics", "routes/config.automation.analytics.tsx"),
  route("/config/automation/digests", "routes/config.automation.digests.tsx"),
  route("/config/automation/agents", "routes/config.automation.agents.tsx"),
  route("/settings/activity-icons", "routes/settings.activity-icons.tsx"),
  route("/settings/ai-provider", "routes/settings.ai-provider.tsx"),
  // Gamification routes
  route("/gamification", "routes/gamification.tsx"),
  route("/gamification/manager", "routes/gamification.manager.tsx"),
  // Admin routes
  route("/admin/setup", "routes/admin.setup.tsx"),
  // Content & collaboration routes
  route("/comments", "routes/comments.tsx"),
  route("/notifications", "routes/notifications.tsx"),
  route("/templates", "routes/templates.tsx"),
  route("/reporting", "routes/reporting.tsx"),
  route("/workflows", "routes/workflows.tsx"),
  route("/views/filters", "routes/views.filters.tsx"),`;

function discoverFeatureRoutes(): ModuleRoutesConfig[] {
  const configs: ModuleRoutesConfig[] = [];

  if (!fs.existsSync(FEATURES_DIR)) {
    return configs;
  }

  const featureDirs = fs.readdirSync(FEATURES_DIR, { withFileTypes: true });

  for (const entry of featureDirs) {
    if (!entry.isDirectory()) {
      continue;
    }

    const configPath = path.join(FEATURES_DIR, entry.name, "routes.config.ts");
    if (!fs.existsSync(configPath)) {
      continue;
    }

    try {
      const mod = require(configPath);
      const moduleKey = mod.moduleKey ?? entry.name;
      const routes: RouteDefinition[] = mod.routes ?? [];

      if (routes.length > 0) {
        configs.push({ moduleKey, routes });
      }
    } catch (err) {
      console.error(
        `[generate-routes] Error loading ${configPath}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return configs.sort((a, b) => a.moduleKey.localeCompare(b.moduleKey));
}

function formatRoute(r: RouteDefinition, indent: string): string {
  return `${indent}route("${r.path}", "${r.file}"),`;
}

function generateRoutes(): void {
  const lines: string[] = [CORE_ROUTES_HEADER];
  const included: string[] = [];
  const skipped: string[] = [];

  const businessRoutes = discoverFeatureRoutes();

  for (const config of businessRoutes) {
    const featureDir = path.join(FEATURES_DIR, config.moduleKey);
    if (fs.existsSync(featureDir)) {
      lines.push(`  // ${config.moduleKey} routes`);
      for (const r of config.routes) {
        lines.push(formatRoute(r, "  "));
      }
      included.push(config.moduleKey);
    } else {
      skipped.push(config.moduleKey);
    }
  }

  lines.push('  route("*", "routes/not-found.tsx"), // Catch-all for 404');
  lines.push("] satisfies RouteConfig;");
  lines.push("");

  fs.writeFileSync(ROUTES_FILE, lines.join("\n"), "utf-8");

  console.log(`[generate-routes] Routes file written: ${ROUTES_FILE}`);
  if (included.length) {
    console.log(`  Included: ${included.join(", ")}`);
  }
  if (skipped.length) {
    console.log(`  Skipped (feature not found): ${skipped.join(", ")}`);
  }
}

generateRoutes();
