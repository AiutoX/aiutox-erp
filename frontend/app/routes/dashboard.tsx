/**
 * Dashboard Page
 * Module-sectioned dashboard — each module has a branded header, quick-action links,
 * and a link to open the full module. Widget visibility persisted per user in localStorage.
 * TODO: Migrate preferences storage to GET/PUT /api/v1/preferences/dashboard when available.
 */

import React, { useState } from "react";
import {
  BarChart3,
  Building2,
  ExternalLink,
  FileText,
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
import { WIDGET_REGISTRY, useWidgetPreferences } from "~/features/dashboard";
import type { DashboardQuickAction } from "~/features/dashboard/types/widget-registry.types";

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

function QuickActionButton({ action }: { action: DashboardQuickAction }) {
  const { t } = useTranslation();
  const Icon = ICON_MAP[action.icon] ?? Building2;
  return (
    <Link
      to={action.href}
      className="flex items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
    >
      <Icon className="h-3 w-3" />
      {t(action.labelKey)}
    </Link>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { enabledWidgets, toggleWidget, resetToDefaults } =
    useWidgetPreferences();
  const [showConfig, setShowConfig] = useState(false);

  const visibleWidgets = WIDGET_REGISTRY.filter((w) =>
    enabledWidgets.includes(w.id)
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

        {/* ── Module sections ── */}
        <div className="space-y-8">
          {visibleWidgets.map((widget) => {
            const WidgetComponent = widget.component;
            return (
              <RequirePermission
                key={widget.id}
                permission={widget.permission}
                fallback={null}
              >
                <section className="overflow-hidden rounded-xl border shadow-sm">
                  {/* Module header */}
                  <div
                    className="flex flex-wrap items-center gap-3 px-5 py-3"
                    style={{ backgroundColor: widget.accentColor ?? "#023E87" }}
                  >
                    <div className="flex-1 min-w-0">
                      <h2 className="text-sm font-semibold text-white leading-tight">
                        {t(widget.labelKey)}
                      </h2>
                      <p className="text-[11px] text-white/70 leading-tight mt-0.5">
                        {t(widget.descriptionKey)}
                      </p>
                    </div>

                    {/* Quick action pills */}
                    {widget.quickActions && widget.quickActions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {widget.quickActions.map((action) => (
                          <QuickActionButton
                            key={action.href}
                            action={action}
                          />
                        ))}
                      </div>
                    )}

                    {/* Open module link */}
                    {widget.moduleHref && (
                      <Link
                        to={widget.moduleHref}
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
                        <WidgetComponent />
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
              {WIDGET_REGISTRY.map((widget) => (
                <RequirePermission
                  key={widget.id}
                  permission={widget.permission}
                  fallback={null}
                >
                  <div className="flex items-center justify-between border-b border-white/10 py-4">
                    <div className="flex items-center gap-3">
                      {/* Accent dot */}
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/20"
                        style={{
                          backgroundColor: widget.accentColor ?? "#6366f1",
                        }}
                      />
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: "hsl(var(--panel-dark-fg))" }}
                        >
                          {t(widget.labelKey)}
                        </p>
                        <p className="text-xs opacity-60">
                          {t(widget.descriptionKey)}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={enabledWidgets.includes(widget.id)}
                      onCheckedChange={() => toggleWidget(widget.id)}
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
