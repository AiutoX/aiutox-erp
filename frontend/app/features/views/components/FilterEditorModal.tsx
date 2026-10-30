/**
 * Filter Editor Modal Component
 * Main modal for creating/editing saved filters with visual and JSON modes.
 */

import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import type {
  FieldConfig,
  FilterConfig,
  SavedFilter,
  SavedFilterCreate,
} from "../types/savedFilter.types";
import { FilterPreview } from "./FilterPreview";
import { JSONFilterEditor } from "./JSONFilterEditor";
import { VisualFilterEditor } from "./VisualFilterEditor";

export interface FilterEditorModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (filterData: SavedFilterCreate) => Promise<SavedFilter | null>;
  filter?: SavedFilter | null; // For editing existing filter
  module: string;
  fields: FieldConfig[];
  initialFilterConfig?: FilterConfig; // For "save current filter" flow
}

/**
 * Filter Editor Modal component
 */
export function FilterEditorModal({
  open,
  onClose,
  onSave,
  filter,
  module,
  fields,
  initialFilterConfig,
}: FilterEditorModalProps) {
  const [name, setName] = useState(filter?.name || "");
  const [description, setDescription] = useState(filter?.description || "");
  const [isDefault, setIsDefault] = useState(filter?.is_default || false);
  const [isShared, setIsShared] = useState(filter?.is_shared || false);
  const [filterConfig, setFilterConfig] = useState<FilterConfig>(
    filter?.filters || initialFilterConfig || {}
  );
  const [activeTab, setActiveTab] = useState<"visual" | "json">("visual");
  const [isValid, setIsValid] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { t } = useTranslation();

  // Reset form when modal opens/closes or filter changes
  useEffect(() => {
    if (open) {
      if (filter) {
        setName(filter.name);
        setDescription(filter.description || "");
        setIsDefault(filter.is_default);
        setIsShared(filter.is_shared);
        setFilterConfig(filter.filters);
      } else if (initialFilterConfig) {
        setName("");
        setDescription("");
        setIsDefault(false);
        setIsShared(false);
        setFilterConfig(initialFilterConfig);
      } else {
        setName("");
        setDescription("");
        setIsDefault(false);
        setIsShared(false);
        setFilterConfig({});
      }
      setActiveTab("visual");
      setIsValid(false);
      setValidationErrors([]);
      setSaveError(null);
    }
  }, [open, filter, initialFilterConfig]);

  const handleFilterConfigChange = (newConfig: FilterConfig) => {
    setFilterConfig(newConfig);
    setSaveError(null);
  };

  const handleValidationChange = (
    valid: boolean,
    errorOrErrors?: string | string[]
  ) => {
    setIsValid(valid);
    if (Array.isArray(errorOrErrors)) {
      setValidationErrors(errorOrErrors);
    } else if (errorOrErrors) {
      setValidationErrors([errorOrErrors]);
    } else {
      setValidationErrors([]);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setSaveError("El nombre del filtro es requerido");
      return;
    }

    if (!isValid || Object.keys(filterConfig).length === 0) {
      setSaveError("El filtro debe tener al menos una condición válida");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const filterData: SavedFilterCreate = {
        name: name.trim(),
        description: description.trim() || null,
        module,
        filters: filterConfig,
        is_default: isDefault,
        is_shared: isShared,
      };

      const saved = await onSave(filterData);
      if (saved) {
        onClose();
      } else {
        setSaveError(
          "Error al guardar el filtro. Por favor, intenta de nuevo."
        );
      }
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Error al guardar el filtro"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleTabChange = (value: string) => {
    if (value === "json" && activeTab === "visual") {
      // Warn user about losing visual changes
      const confirm = window.confirm(
        "¿Estás seguro? Los cambios del editor visual se perderán al cambiar a modo JSON."
      );
      if (!confirm) {
        return;
      }
    }
    setActiveTab(value as "visual" | "json");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {filter ? t("filterEditor.edit") : t("filterEditor.create")}
          </DialogTitle>
          <DialogDescription>
            {filter
              ? "Modifica el filtro guardado. Los cambios se aplicarán inmediatamente."
              : "Crea un nuevo filtro guardado para reutilizarlo más tarde o compartirlo con tu equipo."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="filter-name">Nombre del Filtro *</Label>
              <Input
                id="filter-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("filterEditor.namePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-description">Descripción (opcional)</Label>
              <Textarea
                id="filter-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe qué hace este filtro..."
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between space-x-4 rounded-md border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="filter-default">
                  {t("filterEditor.isDefault")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  Este filtro se aplicará automáticamente al abrir este módulo
                </p>
              </div>
              <Switch
                id="filter-default"
                checked={isDefault}
                onCheckedChange={setIsDefault}
              />
            </div>

            <div className="flex items-center justify-between space-x-4 rounded-md border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="filter-shared">Compartir con el equipo</Label>
                <p className="text-xs text-muted-foreground">
                  Otros usuarios podrán ver y usar este filtro
                </p>
              </div>
              <Switch
                id="filter-shared"
                checked={isShared}
                onCheckedChange={setIsShared}
              />
            </div>
          </div>

          {/* Filter Editor Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="visual">Editor Visual</TabsTrigger>
              <TabsTrigger value="json">Modo Avanzado (JSON)</TabsTrigger>
            </TabsList>

            <TabsContent value="visual" className="space-y-4">
              <VisualFilterEditor
                fields={fields}
                value={filterConfig}
                onChange={handleFilterConfigChange}
                onValidationChange={(isValid, errors) =>
                  handleValidationChange(isValid, errors)
                }
              />
            </TabsContent>

            <TabsContent value="json" className="space-y-4">
              <JSONFilterEditor
                value={filterConfig}
                onChange={handleFilterConfigChange}
                onValidationChange={(isValid, error) =>
                  handleValidationChange(isValid, error)
                }
              />
            </TabsContent>
          </Tabs>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3">
              <p className="text-sm font-semibold text-destructive">
                Errores de validación:
              </p>
              <ul className="mt-2 list-disc list-inside text-sm text-destructive">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Save Error */}
          {saveError && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {saveError}
            </div>
          )}

          {/* Preview */}
          {isValid && Object.keys(filterConfig).length > 0 && (
            <FilterPreview filterConfig={filterConfig} fields={fields} />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={!isValid || isSaving || !name.trim()}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving
              ? t("filterEditor.saving")
              : filter
                ? t("filterEditor.update")
                : t("filterEditor.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
