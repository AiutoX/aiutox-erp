/**
 * Permission utilities for SavedFilters.
 * Checks if user can edit/delete filters based on ownership and roles.
 */

import type { SavedFilter } from "../types/savedFilter.types";
import type { User } from "~/features/users/types/user.types";

/**
 * Check if user can edit a filter
 * Only the creator can edit their own filters
 */
export function canEditFilter(
  filter: SavedFilter,
  currentUser: User | null
): boolean {
  if (!currentUser) return false;
  if (!filter.created_by) return false;
  return filter.created_by === currentUser.id;
}

/**
 * Check if user can delete a filter
 * Can delete if:
 * - User is the creator, OR
 * - User is admin of the module, OR
 * - User is admin of the organization, OR
 * - User is super user (owner role)
 */
export function canDeleteFilter(
  filter: SavedFilter,
  currentUser: User | null,
  _module: string
): boolean {
  if (!currentUser) return false;

  // Creator can always delete
  if (filter.created_by === currentUser.id) {
    return true;
  }

  // Check for admin roles
  const userRoles = currentUser.roles || [];
  const roleNames = userRoles.map((ur) => ur.role);

  // Super user / Owner
  if (roleNames.includes("owner")) {
    return true;
  }

  // Admin of organization
  if (roleNames.includes("admin")) {
    return true;
  }

  // Admin of module (would need module-specific role check)
  // For now, checking for module admin permission pattern
  // This would need to be enhanced based on actual RBAC implementation
  // TODO: Implement module-specific role checking
  // if (moduleRoles.some(mr => mr.role.includes("admin"))) {
  //   return true;
  // }

  return false;
}

/**
 * Check if user can share a filter
 * Only the creator can share/unshare
 */
export function canShareFilter(
  filter: SavedFilter,
  currentUser: User | null
): boolean {
  return canEditFilter(filter, currentUser);
}

/**
 * Check if user has permission to view filters
 */
export function canViewFilters(currentUser: User | null): boolean {
  if (!currentUser) return false;
  const userRoles = currentUser.roles || [];
  const roleNames = userRoles.map((ur) => ur.role);
  // All authenticated users can view filters
  return roleNames.length > 0;
}

/**
 * Check if user has permission to manage (create/edit) filters
 */
export function canManageFilters(currentUser: User | null): boolean {
  if (!currentUser) return false;
  const userRoles = currentUser.roles || [];
  const roleNames = userRoles.map((ur) => ur.role);
  // Admin and above can manage filters
  return (
    roleNames.includes("admin") ||
    roleNames.includes("owner") ||
    roleNames.includes("manager")
  );
}

/**
 * Check if user has permission to share filters
 */
export function canShareFilters(currentUser: User | null): boolean {
  if (!currentUser) return false;
  const userRoles = currentUser.roles || [];
  const roleNames = userRoles.map((ur) => ur.role);
  // Admin and above can share filters
  return (
    roleNames.includes("admin") ||
    roleNames.includes("owner") ||
    roleNames.includes("manager")
  );
}
