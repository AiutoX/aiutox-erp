/**
 * FileTags Component
 * Displays and manages tags for a file
 */

import { useState } from "react";
import { X, Plus, Tag as TagIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { showToast } from "~/components/common/Toast";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  useFileTags,
  useAddFileTags,
  useRemoveFileTag,
} from "../hooks/useFileTags";
import { useFilePermissions } from "../hooks/useFilePermissions";
import { useHasPermission } from "~/hooks/usePermissions";
import apiClient from "~/lib/api/client";
import type { StandardListResponse } from "~/lib/api/types/common.types";
import type { Tag } from "../api/files.api";
import { TagManagerModal } from "~/features/tags/components/TagManagerModal";
import type { Tag as TagFromTagsModule } from "~/features/tags/api/tags.api";

interface FileTagsProps {
  fileId: string;
  fileTags?: Array<{
    id: string;
    name: string;
    color: string | null;
  }> | null;
}

/**
 * FileTags component
 */
export function FileTags({ fileId, fileTags }: FileTagsProps) {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

  const { tags, loading, refetch } = useFileTags(fileId);
  const { mutate: addTags } = useAddFileTags(fileId);
  const { mutate: removeTag, isPending: removing } = useRemoveFileTag(fileId);
  const filePermissions = useFilePermissions(fileId);
  const hasFilesManage = useHasPermission("files.manage");

  const canEdit = filePermissions.canEdit || hasFilesManage;

  // Use tags from hook if available, otherwise use fileTags prop
  const displayTags = tags.length > 0 ? tags : fileTags || [];

  // Fetch available tags when dialog opens
  const handleDialogOpen = async (open: boolean) => {
    setIsDialogOpen(open);
    if (open) {
      setLoadingTags(true);
      try {
        const response =
          await apiClient.get<StandardListResponse<Tag>>("/tags");
        setAvailableTags(response.data.data || []);
      } catch (error) {
        console.error("Failed to load tags:", error);
        showToast(t("files.tags.loadError") || "Error loading tags", "error");
      } finally {
        setLoadingTags(false);
      }
    }
  };

  // Get tags that are not already on the file
  const availableTagsToAdd = availableTags.filter(
    (tag) => !displayTags.some((ft) => ft.id === tag.id)
  );

  // Filter tags by search query
  const filteredTags = availableTagsToAdd.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddTag = (tagId: string) => {
    addTags([tagId], {
      onSuccess: () => {
        showToast(
          t("files.tags.addSuccess") || "Tag added successfully",
          "success"
        );
        refetch();
        setSearchQuery("");
      },
      onError: () => {
        showToast(t("files.tags.addError") || "Error adding tag", "error");
      },
    });
  };

  const handleRemoveTag = (tagId: string) => {
    removeTag(tagId, {
      onSuccess: () => {
        showToast(
          t("files.tags.removeSuccess") || "Tag removed successfully",
          "success"
        );
        refetch();
      },
      onError: () => {
        showToast(t("files.tags.removeError") || "Error removing tag", "error");
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">{t("files.loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TagIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {t("files.tags.title") || "Tags"}
          </span>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <TagManagerModal
              trigger={
                <Button variant="ghost" size="sm">
                  <TagIcon className="h-4 w-4 mr-1" />
                  {t("tags.manage") || "Manage Tags"}
                </Button>
              }
              onTagCreated={(tag: TagFromTagsModule) => {
                // Auto-add the newly created tag to the file
                handleAddTag(tag.id);
              }}
            />
            <Dialog open={isDialogOpen} onOpenChange={handleDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  {t("files.tags.add") || "Add Tag"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {t("files.tags.addTag") || "Add Tag"}
                  </DialogTitle>
                  <DialogDescription>
                    {t("files.tags.addTagDescription") ||
                      "Select a tag to add to this file"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder={t("files.tags.search") || "Search tags..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div className="max-h-[300px] overflow-y-auto space-y-1">
                    {loadingTags ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {t("files.loading")}
                      </div>
                    ) : filteredTags.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {t("files.tags.noTagsAvailable") || "No tags available"}
                      </div>
                    ) : (
                      filteredTags.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => {
                            handleAddTag(tag.id);
                            setSearchQuery("");
                          }}
                          className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent text-left"
                        >
                          {tag.color && (
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                          )}
                          <span>{tag.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {displayTags.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("files.tags.noTags") || "No tags assigned"}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {displayTags.map((tag) => (
            <Badge
              key={tag.id}
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
              {canEdit && (
                <button
                  onClick={() => handleRemoveTag(tag.id)}
                  disabled={removing}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                  aria-label={t("files.tags.remove") || "Remove tag"}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
