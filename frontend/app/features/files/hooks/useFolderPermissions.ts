/**
 * React hooks for folder permissions management
 *
 * Provides utilities to check folder-specific permissions,
 * combining module-level permissions with folder-specific permissions
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "~/stores/authStore";
import { useHasPermission } from "~/hooks/usePermissions";
import {
  getFolderPermissions,
  type FolderPermission,
} from "../api/folders.api";

export interface FolderPermissions {
  canView: boolean;
  canCreateFiles: boolean;
  canCreateFolders: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManagePermissions: boolean;
  isOwner: boolean;
}

/**
 * Hook to get folder permissions for a specific folder
 *
 * Combines:
 * - Module-level permissions (folders.view, folders.manage)
 * - Folder-specific permissions (from FolderPermission model)
 * - Owner status (created_by === current_user.id)
 *
 * @param folderId - Folder ID
 * @param folder - Optional folder object (to avoid extra API call if already loaded)
 */
export function useFolderPermissions(
  folderId: string | null,
  folder?: { created_by: string | null } | null
): FolderPermissions {
  const user = useAuthStore((state) => state.user);
  const hasFoldersView = useHasPermission("folders.view");
  const hasFoldersManage = useHasPermission("folders.manage");

  // Get folder permissions from backend
  const { data: permissionsResponse } = useQuery({
    queryKey: ["folder-permissions", folderId],
    queryFn: () => {
      if (!folderId) throw new Error("Folder ID is required");
      return getFolderPermissions(folderId);
    },
    enabled: !!folderId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get folder info if not provided
  // const { data: folderResponse } = useQuery({
  //   queryKey: ["folder", folderId],
  //   queryFn: () => {
  //     if (!folderId) throw new Error("Folder ID is required");
  //     return getFolder(folderId);
  //   },
  //   enabled: !!folderId && !folder,
  //   staleTime: 1000 * 60 * 5, // 5 minutes
  // });

  const folderData = folder;

  return useMemo(() => {
    const permissions: FolderPermission[] = permissionsResponse?.data || [];
    if (!folderId || !user) {
      return {
        canView: false,
        canCreateFiles: false,
        canCreateFolders: false,
        canEdit: false,
        canDelete: false,
        canManagePermissions: false,
        isOwner: false,
      };
    }

    // Check if user is owner
    const isOwner = folderData?.created_by === user.id;

    // If owner, has all permissions
    if (isOwner) {
      return {
        canView: true,
        canCreateFiles: true,
        canCreateFolders: true,
        canEdit: true,
        canDelete: true,
        canManagePermissions: true,
        isOwner: true,
      };
    }

    // Check folder-specific permissions
    const userPermission = permissions.find((p) => {
      if (p.target_type === "user" && p.target_id === user.id) {
        return true;
      }
      // TODO: Check role and organization permissions
      // This would require checking user.roles and user.organizations
      return false;
    });

    // Combine module-level and folder-specific permissions
    const canView =
      hasFoldersView || userPermission?.can_view === true || false;
    const canCreateFiles =
      hasFoldersManage || userPermission?.can_create_files === true || false;
    const canCreateFolders =
      hasFoldersManage || userPermission?.can_create_folders === true || false;
    const canEdit =
      hasFoldersManage || userPermission?.can_edit === true || false;
    const canDelete =
      hasFoldersManage || userPermission?.can_delete === true || false;
    const canManagePermissions = hasFoldersManage || false;

    return {
      canView,
      canCreateFiles,
      canCreateFolders,
      canEdit,
      canDelete,
      canManagePermissions,
      isOwner: false,
    };
  }, [
    folderId,
    user,
    folderData,
    permissionsResponse?.data,
    hasFoldersView,
    hasFoldersManage,
  ]);
}
