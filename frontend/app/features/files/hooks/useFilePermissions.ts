/**
 * React hooks for file permissions management
 *
 * Provides utilities to check file-specific permissions,
 * combining module-level permissions with file-specific permissions
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/authStore";
import { useHasPermission } from "~/hooks/usePermissions";
import { getFilePermissions, getFile } from "../api/files.api";
import type { FilePermission } from "../types/file.types";

export interface FilePermissions {
  canView: boolean;
  canDownload: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManagePermissions: boolean;
  isOwner: boolean;
}

/**
 * Hook to get file permissions for a specific file
 *
 * Combines:
 * - Module-level permissions (files.view, files.manage)
 * - File-specific permissions (from FilePermission model)
 * - Owner status (uploaded_by === current_user.id)
 *
 * @param fileId - File ID
 * @param file - Optional file object (to avoid extra API call if already loaded)
 */
export function useFilePermissions(
  fileId: string | null,
  file?: { uploaded_by: string | null } | null
): FilePermissions {
  const user = useAuthStore((state) => state.user);
  const hasFilesView = useHasPermission("files.view");
  const hasFilesManage = useHasPermission("files.manage");

  // Get file permissions from backend
  const { data: permissionsResponse } = useQuery({
    queryKey: ["file-permissions", fileId],
    queryFn: () => {
      if (!fileId) throw new Error("File ID is required");
      return getFilePermissions(fileId);
    },
    enabled: !!fileId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get file info if not provided
  const { data: fileResponse } = useQuery({
    queryKey: ["file", fileId],
    queryFn: () => {
      if (!fileId) throw new Error("File ID is required");
      return getFile(fileId);
    },
    enabled: !!fileId && !file,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const fileData = file || fileResponse?.data;
  const permissions: FilePermission[] = useMemo(
    () => permissionsResponse?.data || [],
    [permissionsResponse?.data]
  );

  return useMemo(() => {
    if (!fileId || !user) {
      return {
        canView: false,
        canDownload: false,
        canEdit: false,
        canDelete: false,
        canManagePermissions: false,
        isOwner: false,
      };
    }

    // Check if user is owner
    const isOwner = fileData?.uploaded_by === user.id;

    // If owner, has all permissions
    if (isOwner) {
      return {
        canView: true,
        canDownload: true,
        canEdit: true,
        canDelete: true,
        canManagePermissions: true,
        isOwner: true,
      };
    }

    // Check file-specific permissions
    const userPermission = permissions.find((p) => {
      if (p.target_type === "user" && p.target_id === user.id) {
        return true;
      }
      // TODO: Check role and organization permissions
      // This would require checking user.roles and user.organizations
      return false;
    });

    // Combine module-level and file-specific permissions
    const canView = hasFilesView || userPermission?.can_view === true || false;
    const canDownload =
      canView || userPermission?.can_download === true || false;
    const canEdit =
      hasFilesManage || userPermission?.can_edit === true || false;
    const canDelete =
      hasFilesManage || userPermission?.can_delete === true || false;
    const canManagePermissions = hasFilesManage || false;

    return {
      canView,
      canDownload,
      canEdit,
      canDelete,
      canManagePermissions,
      isOwner: false,
    };
  }, [fileId, user, fileData, permissions, hasFilesView, hasFilesManage]);
}
