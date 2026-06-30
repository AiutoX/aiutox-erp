/**
 * TagManagerModal Component
 * Reusable modal for CRUD operations on tags
 * Can be used from multiple modules (files, tasks, etc.)
 */

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, X, Tag as TagIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { showToast } from "~/components/common/Toast";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  useTags,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
} from "../hooks/useTags";
import { useHasPermission } from "~/hooks/usePermissions";
import type { Tag } from "../api/tags.api";

export interface TagManagerModalProps {
  /** Whether the modal is open */
  open?: boolean;
  /** Callback when modal open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Trigger button (if not provided, uses default button) */
  trigger?: React.ReactNode;
  /** Callback when a tag is created/updated (useful for auto-selecting new tag) */
  onTagCreated?: (tag: Tag) => void;
  /** Callback when a tag is updated */
  onTagUpdated?: (tag: Tag) => void;
  /** Callback when a tag is deleted */
  onTagDeleted?: (tagId: string) => void;
  /** Whether to show create button in the modal */
  showCreateButton?: boolean;
  /** Filter by category ID */
  categoryId?: string | null;
}

/**
 * TagManagerModal component
 */
export function TagManagerModal({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
  onTagCreated,
  onTagUpdated,
  onTagDeleted,
  showCreateButton = true,
  categoryId,
}: TagManagerModalProps) {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    tagId: string | null;
  }>({ open: false, tagId: null });
  const [searchQuery, setSearchQuery] = useState("");

  // Use controlled or internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen =
    controlledOnOpenChange || ((open: boolean) => setInternalOpen(open));

  // Permissions
  const hasManagePermission = useHasPermission("tags.manage");
  const hasViewPermission = useHasPermission("tags.view");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    color: "#FF5733",
    description: "",
  });

  // Queries
  const { data: tags = [], isLoading } = useTags({
    category_id: categoryId,
    search: searchQuery || undefined,
  });

  // Mutations
  const { mutate: createTag, isPending: creating } = useCreateTag();
  const { mutate: updateTag, isPending: updating } = useUpdateTag();
  const { mutate: deleteTag, isPending: deleting } = useDeleteTag();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({ name: "", color: "#FF5733", description: "" });
      setEditingTag(null);
      setSearchQuery("");
    }
  }, [isOpen]);

  const handleCreate = () => {
    if (!formData.name.trim()) {
      showToast(t("tags.nameRequired") || "Tag name is required", "error");
      return;
    }

    createTag(
      {
        name: formData.name.trim(),
        color: formData.color || null,
        description: formData.description.trim() || null,
        category_id: categoryId || null,
      },
      {
        onSuccess: (response) => {
          if (response.data) {
            onTagCreated?.(response.data);
            setFormData({ name: "", color: "#FF5733", description: "" });
          }
        },
      }
    );
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color || "#FF5733",
      description: tag.description || "",
    });
  };

  const handleUpdate = () => {
    if (!editingTag || !formData.name.trim()) {
      showToast(t("tags.nameRequired") || "Tag name is required", "error");
      return;
    }

    updateTag(
      {
        tagId: editingTag.id,
        tagData: {
          name: formData.name.trim(),
          color: formData.color || null,
          description: formData.description.trim() || null,
        },
      },
      {
        onSuccess: (response) => {
          if (response.data) {
            onTagUpdated?.(response.data);
            setEditingTag(null);
            setFormData({ name: "", color: "#FF5733", description: "" });
          }
        },
      }
    );
  };

  const handleDelete = (tagId: string) => {
    setDeleteConfirm({ open: true, tagId });
  };

  const confirmDelete = () => {
    if (deleteConfirm.tagId) {
      deleteTag(deleteConfirm.tagId, {
        onSuccess: () => {
          onTagDeleted?.(deleteConfirm.tagId!);
          setDeleteConfirm({ open: false, tagId: null });
        },
      });
    }
  };

  const handleCancel = () => {
    setEditingTag(null);
    setFormData({ name: "", color: "#FF5733", description: "" });
  };

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Default trigger button
  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <TagIcon className="h-4 w-4 mr-2" />
      {t("tags.manage") || "Manage Tags"}
    </Button>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("tags.manage") || "Manage Tags"}</DialogTitle>
            <DialogDescription>
              {t("tags.manageDescription") ||
                "Create, edit, and delete tags. Tags can be used across different modules."}
            </DialogDescription>
          </DialogHeader>

          {!hasViewPermission && (
            <div className="text-sm text-muted-foreground">
              {t("tags.noPermission") ||
                "You don't have permission to view tags"}
            </div>
          )}

          {hasViewPermission && (
            <div className="space-y-4">
              {/* Search */}
              <div className="flex items-center gap-2">
                <Input
                  placeholder={t("tags.search") || "Search tags..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                {/* Only show create button if form is not already visible by default */}
                {showCreateButton &&
                  hasManagePermission &&
                  editingTag !== null && (
                    <Button
                      onClick={() => {
                        setEditingTag(null);
                        setFormData({
                          name: "",
                          color: "#FF5733",
                          description: "",
                        });
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t("tags.create") || "Create Tag"}
                    </Button>
                  )}
              </div>

              {/* Create/Edit Form */}
              {(editingTag ||
                (!editingTag && showCreateButton && hasManagePermission)) && (
                <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      {editingTag
                        ? t("tags.edit") || "Edit Tag"
                        : t("tags.create") || "Create Tag"}
                    </h3>
                    {editingTag && (
                      <Button variant="ghost" size="sm" onClick={handleCancel}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tag-name">
                        {t("tags.name") || "Name"} *
                      </Label>
                      <Input
                        id="tag-name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder={
                          t("tags.namePlaceholder") || "Enter tag name"
                        }
                        maxLength={100}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tag-color">
                        {t("tags.color") || "Color"}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="tag-color"
                          type="color"
                          value={formData.color}
                          onChange={(e) =>
                            setFormData({ ...formData, color: e.target.value })
                          }
                          className="w-20 h-10"
                        />
                        <Input
                          type="text"
                          value={formData.color}
                          onChange={(e) =>
                            setFormData({ ...formData, color: e.target.value })
                          }
                          placeholder="#FF5733"
                          maxLength={7}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tag-description">
                      {t("tags.description") || "Description"}
                    </Label>
                    <Textarea
                      id="tag-description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder={
                        t("tags.descriptionPlaceholder") ||
                        "Enter description (optional)"
                      }
                      maxLength={500}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    {editingTag && (
                      <Button variant="outline" onClick={handleCancel}>
                        {t("savedFilters.cancel") ||
                          t("users.cancel") ||
                          "Cancel"}
                      </Button>
                    )}
                    <Button
                      onClick={editingTag ? handleUpdate : handleCreate}
                      disabled={creating || updating || !formData.name.trim()}
                    >
                      {creating || updating
                        ? t("filterEditor.saving") ||
                          t("users.saving") ||
                          "Saving..."
                        : editingTag
                          ? t("tags.update") || "Update"
                          : t("tags.create") || "Create"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Tags List */}
              <div className="border rounded-lg">
                <div className="p-4 border-b">
                  <h3 className="font-semibold">
                    {t("tags.list") || "Tags"} ({filteredTags.length})
                  </h3>
                </div>
                {isLoading ? (
                  <div className="p-8 text-center text-muted-foreground">
                    {t("savedFilters.loading") ||
                      t("users.loading") ||
                      "Loading..."}
                  </div>
                ) : filteredTags.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    {searchQuery
                      ? t("tags.noResults") || "No tags found"
                      : t("tags.noTags") ||
                        "No tags yet. Create your first tag!"}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("tags.name") || "Name"}</TableHead>
                        <TableHead>{t("tags.color") || "Color"}</TableHead>
                        <TableHead>
                          {t("tags.description") || "Description"}
                        </TableHead>
                        {hasManagePermission && (
                          <TableHead className="text-right">
                            {t("users.actions") || "Actions"}
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTags.map((tag) => (
                        <TableRow key={tag.id}>
                          <TableCell className="font-medium">
                            {tag.name}
                          </TableCell>
                          <TableCell>
                            {tag.color && (
                              <Badge
                                style={{
                                  backgroundColor: tag.color,
                                  color: getContrastColor(tag.color),
                                }}
                              >
                                {tag.color}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {tag.description || "-"}
                          </TableCell>
                          {hasManagePermission && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(tag)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(tag.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() =>
          setDeleteConfirm({ open: false, tagId: deleteConfirm.tagId })
        }
        onConfirm={confirmDelete}
        title={t("tags.deleteConfirm") || "Delete Tag"}
        description={
          t("tags.deleteConfirmDescription") ||
          "Are you sure you want to delete this tag? This action cannot be undone."
        }
        confirmText={t("savedFilters.delete") || t("users.delete") || "Delete"}
        cancelText={t("savedFilters.cancel") || t("users.cancel") || "Cancel"}
        variant="destructive"
        loading={deleting}
      />
    </>
  );
}

/**
 * Helper function to get contrast color (black or white) based on background
 */
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}
