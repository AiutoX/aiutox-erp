/**
 * Views Filters page
 * Main page for managing saved filters across modules
 */

import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Switch } from "~/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
// import { FilterManagementModal } from "~/features/views/components/FilterManagementModal";
// import { SavedFilters } from "~/features/views/components/SavedFilters";
import { useSavedFilters } from "~/features/views/hooks/useSavedFilters";
import type {
  SavedFilter,
  SavedFilterCreate,
  SavedFilterUpdate,
} from "~/features/views/types/savedFilter.types";

export default function ViewsFiltersPage() {
  const { t } = useTranslation();
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<SavedFilter | null>(
    null
  );

  const {
    filters,
    loading,
    error,
    createFilter,
    updateFilter,
    removeFilter,
    refreshFilters,
  } = useSavedFilters(selectedModule === "all" ? undefined : selectedModule);

  const handleCreateFilter = () => {
    setSelectedFilter(null);
    setShowCreateDialog(true);
  };

  const handleEditFilter = (filter: SavedFilter) => {
    setSelectedFilter(filter);
    setShowEditDialog(true);
  };

  const handleDeleteFilter = (filter: SavedFilter) => {
    if (!confirm(t("views.filters.deleteConfirm"))) return;

    void removeFilter(filter.id).then((success) => {
      if (success) {
        void refreshFilters();
      }
    });
  };

  const handleFilterSubmit = (data: SavedFilterCreate | SavedFilterUpdate) => {
    if (showCreateDialog) {
      void createFilter(data as SavedFilterCreate).then(() => {
        setShowCreateDialog(false);
        void refreshFilters();
      });
    } else if (showEditDialog && selectedFilter) {
      void updateFilter(selectedFilter.id, data).then(
        () => {
          setShowEditDialog(false);
          setSelectedFilter(null);
          void refreshFilters();
        }
      );
    }
  };

  const handleFilterCancel = () => {
    setShowCreateDialog(false);
    setShowEditDialog(false);
    setSelectedFilter(null);
  };

  const modules = [
    { value: "all", label: t("views.filters.allModules") },
    { value: "tasks", label: t("views.filters.modules.tasks") },
    { value: "calendar", label: t("views.filters.modules.calendar") },
    { value: "products", label: t("views.filters.modules.products") },
    { value: "inventory", label: t("views.filters.modules.inventory") },
    { value: "crm", label: t("views.filters.modules.crm") },
    { value: "automation", label: t("views.filters.modules.automation") },
  ];

  const filteredFilters =
    selectedModule === "all"
      ? filters
      : filters.filter((f) => f.module === selectedModule);

  return (
    <PageLayout
      title={t("views.filters.title")}
      description={t("views.filters.description")}
      loading={loading}
      error={error}
    >
      <div className="space-y-6">
        {/* Module selector */}
        <Card>
          <CardHeader>
            <CardTitle>{t("views.filters.selectModule")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modules.map((mod) => (
                  <SelectItem key={mod.value} value={mod.value}>
                    {mod.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Filters list */}
        <div className="flex justify-between items-center">
          <div>
            <Badge variant="secondary">
              {filteredFilters.length} {t("views.filters.filters")}
            </Badge>
          </div>
          <Button onClick={handleCreateFilter}>
            {t("views.filters.createFilter")}
          </Button>
        </div>

        <div className="grid gap-4">
          {filteredFilters.map((filter) => (
            <Card key={filter.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{filter.name}</CardTitle>
                    {filter.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {filter.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Badge
                      variant={filter.is_default ? "default" : "secondary"}
                    >
                      {filter.is_default
                        ? t("views.filters.default")
                        : t("views.filters.custom")}
                    </Badge>
                    {filter.is_shared && (
                      <Badge variant="outline">
                        {t("views.filters.shared")}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    {t("views.filters.module")}: {filter.module}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditFilter(filter)}
                    >
                      {t("common.edit")}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteFilter(filter)}
                    >
                      {t("common.delete")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Create Filter Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("views.filters.createFilter")}</DialogTitle>
            </DialogHeader>
            <FilterForm
              onSubmit={handleFilterSubmit}
              onCancel={handleFilterCancel}
              loading={false}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Filter Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("views.filters.editFilter")}</DialogTitle>
            </DialogHeader>
            <FilterForm
              filter={selectedFilter || undefined}
              onSubmit={handleFilterSubmit}
              onCancel={handleFilterCancel}
              loading={false}
            />
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}

interface FilterFormProps {
  filter?: SavedFilter;
  onSubmit: (data: SavedFilterCreate | SavedFilterUpdate) => void;
  onCancel: () => void;
  loading?: boolean;
}

function FilterForm({
  filter,
  onSubmit,
  onCancel,
  loading = false,
}: FilterFormProps) {
  const { t } = useTranslation();
  const isEdit = !!filter;

  const [name, setName] = useState(filter?.name || "");
  const [description, setDescription] = useState(filter?.description || "");
  const [module, setModule] = useState(filter?.module || "tasks");
  const [isDefault, setIsDefault] = useState(filter?.is_default || false);
  const [isShared, setIsShared] = useState(filter?.is_shared || false);
  const [filtersJson, setFiltersJson] = useState(
    filter?.filters ? JSON.stringify(filter.filters, null, 2) : "{}"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const filtersObj = JSON.parse(filtersJson);
      const data: SavedFilterCreate | SavedFilterUpdate = {
        name,
        description: description || null,
        module,
        filters: filtersObj,
        is_default: isDefault,
        is_shared: isShared,
      };

      onSubmit(data);
    } catch {
      alert(t("views.filters.invalidJson"));
    }
  };

  const modules = [
    { value: "tasks", label: t("views.filters.modules.tasks") },
    { value: "calendar", label: t("views.filters.modules.calendar") },
    { value: "products", label: t("views.filters.modules.products") },
    { value: "inventory", label: t("views.filters.modules.inventory") },
    { value: "crm", label: t("views.filters.modules.crm") },
    { value: "automation", label: t("views.filters.modules.automation") },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t("views.filters.name")}</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("views.filters.namePlaceholder")}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="module">{t("views.filters.module")}</Label>
        <Select value={module} onValueChange={setModule} disabled={isEdit}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {modules.map((mod) => (
              <SelectItem key={mod.value} value={mod.value}>
                {mod.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t("views.filters.description")}</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("views.filters.descriptionPlaceholder")}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="filters">{t("views.filters.filtersJson")}</Label>
        <Textarea
          id="filters"
          value={filtersJson}
          onChange={(e) => setFiltersJson(e.target.value)}
          placeholder={t("views.filters.filtersPlaceholder")}
          rows={10}
          className="font-mono text-sm"
        />
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="isDefault"
            checked={isDefault}
            onCheckedChange={setIsDefault}
          />
          <Label htmlFor="isDefault">{t("views.filters.isDefault")}</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="isShared"
            checked={isShared}
            onCheckedChange={setIsShared}
          />
          <Label htmlFor="isShared">{t("views.filters.isShared")}</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading
            ? t("common.saving")
            : isEdit
              ? t("common.update")
              : t("common.create")}
        </Button>
      </div>
    </form>
  );
}
