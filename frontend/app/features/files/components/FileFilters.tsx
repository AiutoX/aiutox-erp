/**
 * FileFilters Component
 * Provides filtering options for file list
 */

import { useState, useCallback, useEffect } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { useTranslation } from "~/lib/i18n/useTranslation";
import type { File } from "../types/file.types";
import { TagManagerModal } from "~/features/tags/components/TagManagerModal";
import type { Tag as TagFromTagsModule } from "~/features/tags/api/tags.api";

export interface FileFilters {
  mimeType?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  sizeMin?: number | null;
  sizeMax?: number | null;
  uploadedBy?: string | null;
  tags?: string[] | null;
}

export interface FileFiltersProps {
  files: File[];
  onFilterChange: (filteredFiles: File[]) => void;
  availableUsers?: Array<{ id: string; name: string; email: string }>;
  selectedTags?: string[];
  onTagsChange?: (tags: string[]) => void;
}

/**
 * FileFilters component
 */
export function FileFilters({
  files,
  onFilterChange,
  availableUsers = [],
  selectedTags = [],
  onTagsChange,
}: FileFiltersProps) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FileFilters>({});
  const [isOpen, setIsOpen] = useState(false);
  const [availableTags] = useState<
    Array<{ id: string; name: string; color: string | null }>
  >([]);
  const [loadingTags] = useState(false);

  // Apply filters whenever filters or files change
  useEffect(() => {
    const filtered = applyFilters(files, filters);
    onFilterChange(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, filters, onFilterChange]);

  const applyFilters = useCallback(
    (fileList: File[], filterValues: FileFilters): File[] => {
      return fileList.filter((file) => {
        // Filter by MIME type
        if (filterValues.mimeType) {
          const mimeCategory = filterValues.mimeType;
          if (
            mimeCategory === "image" &&
            !file.mime_type.startsWith("image/")
          ) {
            return false;
          }
          if (mimeCategory === "pdf" && file.mime_type !== "application/pdf") {
            return false;
          }
          if (mimeCategory === "document") {
            const docTypes = [
              "application/msword",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              "application/vnd.ms-excel",
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ];
            if (!docTypes.includes(file.mime_type)) {
              return false;
            }
          }
          if (mimeCategory === "other") {
            const excludedTypes = [
              "image/",
              "application/pdf",
              "application/msword",
            ];
            if (excludedTypes.some((type) => file.mime_type.startsWith(type))) {
              return false;
            }
          }
        }

        // Filter by date range
        if (filterValues.dateFrom) {
          const fileDate = new Date(file.created_at);
          const fromDate = new Date(filterValues.dateFrom);
          if (fileDate < fromDate) {
            return false;
          }
        }
        if (filterValues.dateTo) {
          const fileDate = new Date(file.created_at);
          const toDate = new Date(filterValues.dateTo);
          // Add one day to include the entire day
          toDate.setDate(toDate.getDate() + 1);
          if (fileDate >= toDate) {
            return false;
          }
        }

        // Filter by size range
        if (
          filterValues.sizeMin !== null &&
          filterValues.sizeMin !== undefined
        ) {
          const minBytes = filterValues.sizeMin * 1024 * 1024; // Convert MB to bytes
          if (file.size < minBytes) {
            return false;
          }
        }
        if (
          filterValues.sizeMax !== null &&
          filterValues.sizeMax !== undefined
        ) {
          const maxBytes = filterValues.sizeMax * 1024 * 1024; // Convert MB to bytes
          if (file.size > maxBytes) {
            return false;
          }
        }

        // Filter by uploaded by
        if (filterValues.uploadedBy) {
          if (file.uploaded_by !== filterValues.uploadedBy) {
            return false;
          }
        }

        // Filter by tags (client-side fallback, but server-side is preferred)
        if (filterValues.tags && filterValues.tags.length > 0) {
          const fileTagIds = (file.tags || []).map((t) => t.id);
          // File must have ALL selected tags
          const hasAllTags = filterValues.tags.every((tagId) =>
            fileTagIds.includes(tagId)
          );
          if (!hasAllTags) {
            return false;
          }
        }

        return true;
      });
    },
    []
  );

  const handleFilterChange = useCallback(
    (key: keyof FileFilters, value: string | number | null) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value === "" ? null : value,
      }));
    },
    []
  );

  const handleClearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const activeFiltersCount = Object.values(filters).filter(
    (v) => v !== null && v !== undefined && v !== ""
  ).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          {t("files.filters") || "Filtros"}
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            <X className="h-4 w-4 mr-1" />
            {t("files.clearFilters") || "Limpiar Filtros"}
          </Button>
        )}
      </div>

      {isOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {t("files.filters") || "Filtros"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* MIME Type Filter */}
            <div className="space-y-2">
              <Label>{t("files.fileType") || "Tipo de Archivo"}</Label>
              <Select
                value={filters.mimeType || "all"}
                onValueChange={(value) =>
                  handleFilterChange("mimeType", value === "all" ? null : value)
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("files.allTypes") || "Todos los tipos"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("files.allTypes") || "Todos los tipos"}
                  </SelectItem>
                  <SelectItem value="image">
                    {t("files.images") || "Imágenes"}
                  </SelectItem>
                  <SelectItem value="pdf">
                    {t("files.pdfs") || "PDFs"}
                  </SelectItem>
                  <SelectItem value="document">
                    {t("files.documents") || "Documentos"}
                  </SelectItem>
                  <SelectItem value="other">
                    {t("files.other") || "Otros"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("files.dateFrom") || "Desde"}</Label>
                <Input
                  type="date"
                  value={filters.dateFrom || ""}
                  onChange={(e) =>
                    handleFilterChange("dateFrom", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("files.dateTo") || "Hasta"}</Label>
                <Input
                  type="date"
                  value={filters.dateTo || ""}
                  onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                />
              </div>
            </div>

            {/* Size Range Filter */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("files.sizeMin") || "Tamaño Mínimo (MB)"}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={filters.sizeMin || ""}
                  onChange={(e) =>
                    handleFilterChange(
                      "sizeMin",
                      e.target.value === "" ? null : parseFloat(e.target.value)
                    )
                  }
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("files.sizeMax") || "Tamaño Máximo (MB)"}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={filters.sizeMax || ""}
                  onChange={(e) =>
                    handleFilterChange(
                      "sizeMax",
                      e.target.value === "" ? null : parseFloat(e.target.value)
                    )
                  }
                  placeholder="∞"
                />
              </div>
            </div>

            {/* Uploaded By Filter */}
            {availableUsers.length > 0 && (
              <div className="space-y-2">
                <Label>{t("files.uploadedBy") || "Subido por"}</Label>
                <Select
                  value={filters.uploadedBy || "all"}
                  onValueChange={(value) =>
                    handleFilterChange(
                      "uploadedBy",
                      value === "all" ? null : value
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("files.allUsers") || "Todos los usuarios"}
                    />
                  </SelectTrigger>
                  <SelectContent
                    className={availableUsers.length > 6 ? "max-h-[232px]" : ""}
                  >
                    <SelectItem value="all">
                      {t("files.allUsers") || "Todos los usuarios"}
                    </SelectItem>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tags Filter */}
            <div className="space-y-2">
              <Label>{t("files.tags.title") || "Tags"}</Label>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tagId) => {
                    const tag = availableTags.find((t) => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <Badge
                        key={tagId}
                        variant="secondary"
                        className="flex items-center gap-1"
                        style={
                          tag.color
                            ? {
                                backgroundColor: `${tag.color}20`,
                                borderColor: tag.color,
                                color: tag.color,
                              }
                            : undefined
                        }
                      >
                        {tag.name}
                        <button
                          onClick={() => {
                            const newTags = selectedTags.filter(
                              (id) => id !== tagId
                            );
                            onTagsChange?.(newTags);
                          }}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value=""
                    onValueChange={(tagId) => {
                      if (tagId && !selectedTags.includes(tagId)) {
                        onTagsChange?.([...selectedTags, tagId]);
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue
                        placeholder={
                          t("files.tags.select") || "Seleccionar tag"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingTags ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          {t("files.loading")}
                        </div>
                      ) : availableTags.filter(
                          (t) => !selectedTags.includes(t.id)
                        ).length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          {t("files.tags.noTagsAvailable") ||
                            "No hay tags disponibles"}
                        </div>
                      ) : (
                        availableTags
                          .filter((t) => !selectedTags.includes(t.id))
                          .map((tag) => (
                            <SelectItem key={tag.id} value={tag.id}>
                              <div className="flex items-center gap-2">
                                {tag.color && (
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: tag.color }}
                                  />
                                )}
                                <span>{tag.name}</span>
                              </div>
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                  <TagManagerModal
                    trigger={
                      <Button variant="outline" size="sm" type="button">
                        {t("tags.manage") || "Manage"}
                      </Button>
                    }
                    onTagCreated={(tag: TagFromTagsModule) => {
                      // Auto-select the newly created tag
                      if (!selectedTags.includes(tag.id)) {
                        onTagsChange?.([...selectedTags, tag.id]);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
