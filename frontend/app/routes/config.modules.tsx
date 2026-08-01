/**
 * Modules Configuration Page
 *
 * Manage enabled/disabled modules in the system
 * Uses ConfigPageLayout and shared components for visual consistency
 */

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { showToast } from "~/components/common/Toast";
import {
  getModules,
  enableModule,
  disableModule,
  getModuleConfig,
  saveModuleConfig,
} from "~/lib/api/modules.api";
import { useModulesStore } from "~/stores/modulesStore";
import type { ModuleListItem, ModuleSettingField } from "~/lib/modules/types";
import { ConfigPageLayout } from "~/components/config/ConfigPageLayout";
import { ConfigLoadingState } from "~/components/config/ConfigLoadingState";
import { ConfigErrorState } from "~/components/config/ConfigErrorState";
import { ConfigEmptyState } from "~/components/config/ConfigEmptyState";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Switch } from "~/components/ui/switch";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { AlertTriangle, Settings } from "lucide-react";

type FilterType = "all" | "core" | "business";

export function meta() {
  // Note: meta() runs at build time, so we can't use useTranslation() here
  // These are SEO meta tags and will be overridden by the page title/description
  return [
    { title: "Módulos del Sistema - AiutoX ERP" },
    {
      name: "description",
      content: "Gestiona los módulos habilitados en tu sistema",
    },
  ];
}

export default function ModulesConfigPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const refreshModules = useModulesStore((state) => state.refresh);
  const [searchParams] = useSearchParams();
  const moduleParam = searchParams.get("module");
  const [filter, setFilter] = useState<FilterType>("all");
  const highlightedRef = useRef<HTMLDivElement | null>(null);

  // Modal de configuración de módulo
  const [configModule, setConfigModule] = useState<ModuleListItem | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, unknown>>({});
  const [configLoading, setConfigLoading] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["modules"],
    queryFn: getModules,
  });

  const enableMutation = useMutation({
    mutationFn: enableModule,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["modules"] });
      void refreshModules();
      showToast(t("config.modules.enableSuccess"), "success");
    },
    onError: (err) => {
      showToast(
        err instanceof Error ? err.message : t("config.modules.errorEnabling"),
        "error"
      );
    },
  });

  const disableMutation = useMutation({
    mutationFn: disableModule,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["modules"] });
      void refreshModules();
      showToast(t("config.modules.disableSuccess"), "success");
    },
    onError: (err) => {
      showToast(
        err instanceof Error ? err.message : t("config.modules.errorDisabling"),
        "error"
      );
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: ({
      moduleId,
      config,
    }: {
      moduleId: string;
      config: Record<string, unknown>;
    }) => saveModuleConfig(moduleId, config),
    onSuccess: (_, variables) => {
      showToast("Configuración guardada", "success");
      setConfigModule(null);
      // Invalidate module-specific caches so nav and dependent hooks update immediately
      void queryClient.invalidateQueries({
        queryKey: [variables.moduleId, "settings"],
      });
      void queryClient.invalidateQueries({ queryKey: ["modules"] });
    },
    onError: () => {
      showToast("Error al guardar la configuración", "error");
    },
  });

  const openConfigModal = async (module: ModuleListItem) => {
    setConfigModule(module);
    setConfigLoading(true);
    // Seed defaults from schema
    const defaults: Record<string, unknown> = {};
    for (const field of module.settings_schema ?? []) {
      defaults[field.key] = field.default ?? "";
    }
    setConfigValues(defaults);
    try {
      const res = await getModuleConfig(module.id);
      setConfigValues({ ...defaults, ...res.data.config });
    } catch {
      // Keep defaults if fetch fails
    } finally {
      setConfigLoading(false);
    }
  };

  const handleConfigSave = () => {
    if (!configModule) return;
    saveConfigMutation.mutate({
      moduleId: configModule.id,
      config: configValues,
    });
  };

  const handleToggle = (module: ModuleListItem) => {
    const isCritical = module.id === "auth" || module.id === "users";

    if (isCritical && module.enabled) {
      showToast(t("config.modules.tooltipCritical"), "error");
      return;
    }

    if (module.enabled) {
      disableMutation.mutate(module.id);
    } else {
      enableMutation.mutate(module.id);
    }
  };

  // Auto-select tab and scroll to the module specified in ?module=xxx
  // Must be before early returns to satisfy Rules of Hooks
  useEffect(() => {
    const allModules = data?.data || [];
    if (!moduleParam || allModules.length === 0) return;
    const target = allModules.find((m) => m.id === moduleParam);
    if (!target) return;
    setFilter(target.type);
    // Scroll after render
    const timeout = setTimeout(() => {
      if (highlightedRef.current) {
        highlightedRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [moduleParam, data]);

  if (isLoading) {
    return (
      <ConfigPageLayout
        title={t("config.modules.title")}
        description={t("config.modules.description")}
        loading={true}
      >
        <ConfigLoadingState lines={6} />
      </ConfigPageLayout>
    );
  }

  if (error) {
    return (
      <ConfigPageLayout
        title={t("config.modules.title")}
        description={t("config.modules.description")}
        error={error instanceof Error ? error : String(error)}
      >
        <ConfigErrorState message={t("config.modules.errorLoading")} />
      </ConfigPageLayout>
    );
  }

  const modules = data?.data || [];
  const coreModules = modules.filter((m) => m.type === "core");
  const businessModules = modules.filter((m) => m.type === "business");

  const filteredModules =
    filter === "all"
      ? modules
      : filter === "core"
        ? coreModules
        : businessModules;

  const renderModuleCard = (module: ModuleListItem) => {
    const isCritical = module.id === "auth" || module.id === "users";
    const isPending = enableMutation.isPending || disableMutation.isPending;
    const isHighlighted = module.id === moduleParam;

    return (
      <Card
        key={module.id}
        ref={isHighlighted ? highlightedRef : undefined}
        className={
          isHighlighted
            ? "hover:shadow-md transition-shadow ring-2 ring-primary"
            : "hover:shadow-md transition-shadow"
        }
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {module.settings_schema && module.settings_schema.length > 0 ? (
                  <button
                    onClick={() => openConfigModal(module)}
                    className="font-semibold text-base text-left hover:text-primary hover:underline focus:outline-none flex items-center gap-1"
                    title="Configurar módulo"
                  >
                    {module.name}
                    <Settings size={14} className="text-muted-foreground" />
                  </button>
                ) : (
                  <h4 className="font-semibold text-base">{module.name}</h4>
                )}
                <Badge
                  variant={module.type === "core" ? "default" : "secondary"}
                >
                  {module.type === "core"
                    ? t("config.modules.badgeCore")
                    : t("config.modules.badgeBusiness")}
                </Badge>
                {module.enabled && (
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-200"
                  >
                    {t("config.modules.badgeActive")}
                  </Badge>
                )}
                {isCritical && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="destructive" className="cursor-help">
                          <AlertTriangle size={14} className="mr-1" />
                          {t("config.modules.badgeCritical")}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t("config.modules.tooltipCritical")}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              {module.description && (
                <p className="text-sm text-muted-foreground">
                  {module.description}
                </p>
              )}
              {module.dependencies && module.dependencies.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">
                    {t("config.modules.dependencies")}:
                  </span>{" "}
                  {module.dependencies.join(", ")}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={module.enabled}
                onCheckedChange={() => handleToggle(module)}
                disabled={isCritical || isPending}
                aria-label={`${module.enabled ? t("config.modules.tooltipDisable") : t("config.modules.tooltipEnable")} ${module.name}`}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <ConfigPageLayout
      title={t("config.modules.title")}
      description={t("config.modules.description")}
    >
      <div className="space-y-6">
        {/* Filtros con Tabs */}
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as FilterType)}
        >
          <TabsList>
            <TabsTrigger value="all">
              {t("config.modules.filterAll")} ({modules.length})
            </TabsTrigger>
            <TabsTrigger value="core">
              {t("config.modules.filterCore")} ({coreModules.length})
            </TabsTrigger>
            <TabsTrigger value="business">
              {t("config.modules.filterBusiness")} ({businessModules.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Lista de módulos Core */}
        {(filter === "all" || filter === "core") && coreModules.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold">
                {t("config.modules.sectionCore")}
              </h3>
              <Badge variant="default">{coreModules.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {coreModules.map(renderModuleCard)}
            </div>
          </div>
        )}

        {/* Lista de módulos Empresariales */}
        {(filter === "all" || filter === "business") &&
          businessModules.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold">
                  {t("config.modules.sectionBusiness")}
                </h3>
                <Badge variant="secondary">{businessModules.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {businessModules.map(renderModuleCard)}
              </div>
            </div>
          )}

        {/* Estado vacío */}
        {filteredModules.length === 0 && (
          <ConfigEmptyState
            title={t("config.common.noData")}
            description={t("config.common.noData")}
          />
        )}
      </div>

      {/* Modal de configuración de módulo */}
      <Dialog
        open={!!configModule}
        onOpenChange={(open) => !open && setConfigModule(null)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuración — {configModule?.name}</DialogTitle>
            <DialogDescription>
              Ajusta los parámetros del módulo. Los cambios se aplican
              inmediatamente.
            </DialogDescription>
          </DialogHeader>

          {configLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Cargando configuración…
            </div>
          ) : (
            <div className="space-y-5 py-2">
              {(configModule?.settings_schema ?? []).map(
                (field: ModuleSettingField) => (
                  <ModuleSettingFieldComponent
                    key={field.key}
                    field={field}
                    value={configValues[field.key]}
                    onChange={(val) =>
                      setConfigValues((prev) => ({ ...prev, [field.key]: val }))
                    }
                  />
                )
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigModule(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfigSave}
              disabled={configLoading || saveConfigMutation.isPending}
            >
              {saveConfigMutation.isPending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfigPageLayout>
  );
}

// ─── Campo dinámico del formulario ──────────────────────────────────────────

interface ModuleSettingFieldProps {
  field: ModuleSettingField;
  value: unknown;
  onChange: (val: unknown) => void;
}

function ModuleSettingFieldComponent({
  field,
  value,
  onChange,
}: ModuleSettingFieldProps) {
  const fieldId = `msc-${field.key}`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId}>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {field.type === "boolean" && (
        <div className="flex items-center gap-2">
          <Switch
            id={fieldId}
            checked={!!value}
            onCheckedChange={(checked) => onChange(checked)}
          />
          <span className="text-sm text-muted-foreground">
            {value ? "Activo" : "Inactivo"}
          </span>
        </div>
      )}

      {field.type === "select" && (
        <Select
          value={String(value ?? field.default ?? "")}
          onValueChange={(v) => onChange(v)}
        >
          <SelectTrigger id={fieldId}>
            <SelectValue placeholder="Selecciona…" />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {field.type === "number" && (
        <Input
          id={fieldId}
          type="number"
          value={String(value ?? field.default ?? "")}
          min={field.min_value}
          max={field.max_value}
          onChange={(e) => onChange(e.target.valueAsNumber)}
        />
      )}

      {field.type === "text" && (
        <Input
          id={fieldId}
          type="text"
          value={String(value ?? field.default ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
    </div>
  );
}
