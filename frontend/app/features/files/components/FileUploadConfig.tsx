/**
 * FileUploadConfig Component
 * Configuration form for file upload (folder, description, permissions)
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { FolderSelector } from "./FolderSelector";
import { FilePermissionsSelector } from "./FilePermissionsSelector";
import { useUsers } from "~/features/users/hooks/useUsers";
import { useOrganizations } from "~/features/users/hooks/useOrganizations";
import { listRoles } from "~/features/users/api/roles.api";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { FilePermissionRequest } from "../types/file.types";
import { TagManagerModal } from "~/features/tags/components/TagManagerModal";
import type { Tag as TagFromTagsModule } from "~/features/tags/api/tags.api";
import { useTags } from "~/features/tags/hooks/useTags";

export interface FileUploadConfigProps {
  entityType?: string | null;
  entityId?: string | null;
  folderId?: string | null;
  description?: string | null;
  permissions?: FilePermissionRequest[];
  tags?: string[];
  onConfigChange: (config: {
    folderId: string | null;
    description: string | null;
    permissions: FilePermissionRequest[];
    tags: string[];
  }) => void | Promise<void>;
}

/**
 * FileUploadConfig component
 */
export function FileUploadConfig({
  entityType,
  entityId,
  folderId: initialFolderId,
  description: initialDescription,
  permissions: initialPermissions,
  tags: initialTags,
  onConfigChange,
}: FileUploadConfigProps) {
  const [folderId, setFolderId] = useState<string | null>(
    initialFolderId || null
  );
  const [description, setDescription] = useState<string>(
    initialDescription || ""
  );
  const [permissions, setPermissions] = useState<FilePermissionRequest[]>(
    initialPermissions || []
  );
  const [tags, setTags] = useState<string[]>(initialTags || []);
  const [showPermissions, setShowPermissions] = useState(false);
  const { t } = useTranslation();

  // Load available tags using the useTags hook (auto-updates when tags are created)
  const { data: availableTags = [], isLoading: loadingTags } = useTags();

  // Load users, roles, and organizations for permissions selector
  const { users } = useUsers({ page_size: 100 });
  const { organizations } = useOrganizations({ page_size: 100 });
  const { data: rolesData } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const response = await listRoles();
      return response.data || [];
    },
  });

  // Transform data for permissions selector
  const availableUsers = (users || []).map((u) => ({
    id: u.id,
    name:
      u.full_name ||
      `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
      u.email,
    email: u.email,
  }));

  const availableRoles = (rolesData || []).map((r) => ({
    id: r.role,
    name: r.role,
  }));

  const availableOrganizations = organizations
    ? organizations.map((o) => ({
        id: o.id,
        name: o.name,
      }))
    : [];

  const handleFolderChange = (newFolderId: string | null) => {
    setFolderId(newFolderId);
    void onConfigChange({
      folderId: newFolderId,
      description: description.trim() || null,
      permissions,
      tags,
    });
  };

  const handleDescriptionChange = (newDescription: string) => {
    setDescription(newDescription);
    void onConfigChange({
      folderId,
      description: newDescription.trim() || null,
      permissions,
      tags,
    });
  };

  const handlePermissionsChange = (newPermissions: FilePermissionRequest[]) => {
    setPermissions(newPermissions);
    void onConfigChange({
      folderId,
      description: description.trim() || null,
      permissions: newPermissions,
      tags,
    });
  };

  const handleTagsChange = (newTags: string[]) => {
    setTags(newTags);
    void onConfigChange({
      folderId,
      description: description.trim() || null,
      permissions,
      tags: newTags,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {t("files.uploadConfiguration") || "Configuración de Subida"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Folder Selection */}
        <div className="space-y-2">
          <Label htmlFor="folder-selector">
            {t("files.folder") || "Carpeta"}
          </Label>
          <FolderSelector
            selectedFolderId={folderId}
            onSelectFolder={handleFolderChange}
            entityType={entityType}
            entityId={entityId}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="file-description">
            {t("files.description") || "Descripción"}
          </Label>
          <Textarea
            id="file-description"
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder={
              t("files.descriptionPlaceholder") ||
              "Descripción opcional del archivo"
            }
            rows={3}
          />
        </div>

        {/* Tags Selection - MOVED BEFORE Permissions */}
        <div className="space-y-2">
          <Label>
            {t("files.tags.title") || "Tags"} (
            {t("files.optional") || "Opcional"})
          </Label>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {tags.map((tagId) => {
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
                        handleTagsChange(tags.filter((id) => id !== tagId));
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
                  if (tagId && !tags.includes(tagId)) {
                    handleTagsChange([...tags, tagId]);
                  }
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue
                    placeholder={t("files.tags.select") || "Seleccionar tag"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {loadingTags ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      {t("files.loading")}
                    </div>
                  ) : availableTags.filter((t) => !tags.includes(t.id))
                      .length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      {t("files.tags.noTagsAvailable") ||
                        "No hay tags disponibles"}
                    </div>
                  ) : (
                    availableTags
                      .filter((t) => !tags.includes(t.id))
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
                  if (!tags.includes(tag.id)) {
                    handleTagsChange([...tags, tag.id]);
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Permissions (Collapsible) - MOVED AFTER Tags */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>
              {t("files.permissions") || "Permisos"} (
              {t("files.optional") || "Opcional"})
            </Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPermissions(!showPermissions)}
            >
              {showPermissions ? (
                <>
                  <ChevronUp className="mr-1 h-4 w-4" />
                  {t("common.hide") || "Ocultar"}
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-4 w-4" />
                  {t("common.show") || "Mostrar"}
                </>
              )}
            </Button>
          </div>
          {showPermissions && (
            <FilePermissionsSelector
              permissions={permissions}
              onChange={handlePermissionsChange}
              availableUsers={availableUsers}
              availableRoles={availableRoles}
              availableOrganizations={availableOrganizations}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
