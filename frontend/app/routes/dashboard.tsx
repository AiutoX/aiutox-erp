/**
 * Dashboard Page
 * Module-sectioned dashboard — each module has a branded header, quick-action links,
 * and a link to open the full module. Widget visibility persisted server-side per
 * user via GET/PUT /api/v1/users/me/widgets.
 */

import React, { useState } from "react";
import {
  BarChart3,
  Building2,
  ExternalLink,
  FileText,
  LayoutDashboard,
  Receipt,
  Settings,
  Wrench,
} from "lucide-react";
import { Link } from "react-router";
import { ProtectedRoute } from "~/components/auth/ProtectedRoute";
import { RequirePermission } from "~/components/auth/RequirePermission";
import { ErrorBoundary } from "~/components/common/ErrorBoundary";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "~/components/ui/sheet";
import { Skeleton } from "~/components/ui/skeleton";
import { Switch } from "~/components/ui/switch";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { usePermissions } from "~/hooks/usePermissions";
import { useWidgetPreferences } from "~/features/dashboard/hooks/useWidgetPreferences";
import { useAvailableWidgets } from "~/features/dashboard/hooks/useWidgets";
import { resolveWidgetComponent } from "~/features/dashboard/widgetComponentResolver";
import type { WidgetManifestOut } from "~/features/dashboard/types/widgets-api.types";

export function meta() {
  return [
    { title: "Dashboard - AiutoX ERP" },
    { name: "description", content: "AiutoX ERP main control panel" },
  ];
}

// Map icon string names to components (avoids dynamic imports)
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2,
  FileText,
  Receipt,
  BarChart3,
  Wrench,
};

/**
 * Resolve a manifest's i18n key, falling back to the backend-declared literal.
 *
 * Mirrors NavigationTree's `item.labelKey ? t(item.labelKey) : item.label`,
 * with one addition: `t()` returns the key itself when it is missing from the
 * catalog, so a stale key would render as raw `dashboard.widgets.foo` text.
 * Detecting that and falling back to `label` keeps a module that ships a bad
 * key degraded-but-readable rather than visibly broken.
 */
function useManifestText(): (key: string | null | undefined, fallback: string) => string {
  const { t } = useTranslation();
  return (key, fallback) => {
    if (!key) return fallback;
    const translated = t(key);
    return translated === key ? fallback : translated;
  };
}

function QuickActionButton({ action }: { action: Record<string, string> }) {
  const Icon = ICON_MAP[action.icon ?? ""] ?? Building2;
  return (
    <Link
      to={action.href ?? "#"}
      className="flex items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
    >
      <Icon className="h-3 w-3" />
      {action.label}
    </Link>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const manifestText = useManifestText();
  const { hasPermission } = usePermissions();
  const { enabledWidgets, toggleWidget, resetToDefaults } =
    useWidgetPreferences();
  const { data: availableData } = useAvailableWidgets();
  const [showConfig, setShowConfig] = useState(false);

  const availableWidgets = availableData?.data ?? [];

  // Permission gating happens per-section via <RequirePermission> below. The
  // same check is applied here so the empty state can tell "you turned
  // everything off" apart from "nothing is available to your role" — counting
  // only `enabledWidgets` would miss sections that RequirePermission hides.
  // hasPermission("") is true (no permission required), matching the
  // navigation tree's convention.
  const permittedWidgets = availableWidgets.filter((w) =>
    hasPermission(w.permission ?? "")
  );
  const visibleWidgets = permittedWidgets.filter((w) =>
    enabledWidgets.includes(w.widget_id)
  );

  return (
    <ProtectedRoute>
      <PageLayout
        title={t("dashboard.title")}
        description={t("dashboard.description")}
      >
        {/* ── Toolbar ── */}
        <div className="mb-6 flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfig(true)}
          >
            <Settings className="mr-2 h-4 w-4" />
            {t("dashboard.configure")}
          </Button>
        </div>

        {/* ── Empty state ── */}
        {visibleWidgets.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center">
            <LayoutDashboard className="mb-3 h-8 w-8 text-muted-foreground/60" />
            <h2 className="text-sm font-semibold">
              {t("dashboard.emptyTitle")}
            </h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {permittedWidgets.length === 0
                ? t("dashboard.emptyNoneAvailable")
                : t("dashboard.emptyDescription")}
            </p>
            {permittedWidgets.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setShowConfig(true)}
              >
                <Settings className="mr-2 h-4 w-4" />
                {t("dashboard.configure")}
              </Button>
            )}
          </div>
        )}

        {/* ── Module sections ── */}
        <div className="space-y-8">
          {visibleWidgets.map((widget) => {
            const WidgetComponent = resolveWidgetComponent(
              widget.frontend_component
            );
            return (
              <RequirePermission
                key={widget.widget_id}
                permission={widget.permission ?? ""}
                fallback={null}
              >
                <section className="overflow-hidden rounded-xl border shadow-sm">
                  {/* Module header */}
                  <div
                    className="flex flex-wrap items-center gap-3 px-5 py-3"
                    style={{ backgroundColor: widget.accent_color ?? "#023E87" }}
                  >
                    <div className="flex-1 min-w-0">
                      <h2 className="text-sm font-semibold text-white leading-tight">
                        {manifestText(widget.label_key, widget.label)}
                      </h2>
                      <p className="text-[11px] text-white/70 leading-tight mt-0.5">
                        {manifestText(
                          widget.description_key,
                          widget.description
                        )}
                      </p>
                    </div>

                    {/* Quick action pills */}
                    {widget.quick_actions && widget.quick_actions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {widget.quick_actions.map((action) => (
                          <QuickActionButton
                            key={action.href}
                            action={action}
                          />
                        ))}
                      </div>
                    )}

                    {/* Open module link */}
                    {widget.href && (
                      <Link
                        to={widget.href}
                        className="flex shrink-0 items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/25"
                      >
                        {t("dashboard.openModule")}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>

                  {/* Widget content */}
                  <div className="bg-background p-5">
                    <React.Suspense
                      fallback={
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton
                              key={i}
                              className="h-48 w-full rounded-lg"
                            />
                          ))}
                        </div>
                      }
                    >
                      <ErrorBoundary
                        fallback={
                          <div className="flex h-32 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive">
                            {t("dashboard.errorLoading")}
                          </div>
                        }
                      >
                        {WidgetComponent ? (
                          <WidgetComponent />
                        ) : (
                          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                            {manifestText(widget.label_key, widget.label)}
                          </div>
                        )}
                      </ErrorBoundary>
                    </React.Suspense>
                  </div>
                </section>
              </RequirePermission>
            );
          })}
        </div>

        {/* ── Widget configuration Sheet ── */}
        <Sheet open={showConfig} onOpenChange={setShowConfig}>
          {/*
           * Uses --panel-dark-bg / --panel-dark-fg CSS variables defined in app.css.
           * Light mode: deep navy (#023E87 range). Dark mode: near-black.
           * Applied via inline style so Tailwind arbitrary-value scan is not needed.
           */}
          <SheetContent
            side="right"
            className="flex w-85 flex-col gap-0 p-0 sm:max-w-85"
            style={{
              backgroundColor: "hsl(var(--panel-dark-bg))",
              color: "hsl(var(--panel-dark-fg))",
            }}
          >
            {/* Branded header strip */}
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
              <Settings className="h-4 w-4 shrink-0 opacity-70" />
              <SheetTitle
                className="text-sm font-semibold"
                style={{ color: "hsl(var(--panel-dark-fg))" }}
              >
                {t("dashboard.configureWidgets")}
              </SheetTitle>
            </div>

            {/* Widget list — scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-2">
              {availableWidgets.map((widget: WidgetManifestOut) => (
                <RequirePermission
                  key={widget.widget_id}
                  permission={widget.permission ?? ""}
                  fallback={null}
                >
                  <div className="flex items-center justify-between border-b border-white/10 py-4">
                    <div className="flex items-center gap-3">
                      {/* Accent dot */}
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/20"
                        style={{
                          backgroundColor: widget.accent_color ?? "#6366f1",
                        }}
                      />
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: "hsl(var(--panel-dark-fg))" }}
                        >
                          {manifestText(widget.label_key, widget.label)}
                        </p>
                        <p className="text-xs opacity-60">
                          {manifestText(
                            widget.description_key,
                            widget.description
                          )}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={enabledWidgets.includes(widget.widget_id)}
                      onCheckedChange={() => toggleWidget(widget.widget_id)}
                      className="shrink-0 data-[state=checked]:bg-[hsl(var(--brand-accent))] data-[state=unchecked]:bg-white/30 [&>span]:bg-white"
                    />
                  </div>
                </RequirePermission>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 px-5 py-4">
              <Button
                variant="ghost"
                size="sm"
                className="w-full opacity-70 hover:opacity-100 hover:bg-white/10"
                style={{ color: "hsl(var(--panel-dark-fg))" }}
                onClick={resetToDefaults}
              >
                {t("dashboard.resetDefaults")}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </PageLayout>
    </ProtectedRoute>
  );
}
