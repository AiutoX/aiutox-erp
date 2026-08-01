/**
 * Wildcard permission matching, mirroring has_permission() in
 * backend/app/core/auth/permissions.py exactly: "*", "*.*", "module.*",
 * "*.action", and "*.*.action" (an alias for "*.action" the backend also
 * recognizes) all resolve against the literal permission catalog.
 */

export const WILDCARD_PATTERN =
  /^(\*|\*\.\*|[a-z0-9_]+\.\*|\*\.\*\.[a-z0-9_]+|\*\.[a-z0-9_]+)$/;

// "*" and "*.*" both mean total access.
export const TOTAL_ACCESS_WILDCARDS = new Set(["*", "*.*"]);

export function isWildcardPermission(permission: string): boolean {
  return permission.includes("*");
}

export function expandWildcard(
  wildcard: string,
  allPermissions: string[]
): string[] {
  if (TOTAL_ACCESS_WILDCARDS.has(wildcard)) return allPermissions;
  if (wildcard.endsWith(".*")) {
    const module = wildcard.slice(0, -2);
    return allPermissions.filter((p) => p.startsWith(`${module}.`));
  }
  if (wildcard.startsWith("*.*.")) {
    const action = wildcard.slice(4);
    return allPermissions.filter((p) => p.endsWith(`.${action}`));
  }
  if (wildcard.startsWith("*.")) {
    const action = wildcard.slice(2);
    return allPermissions.filter((p) => p.endsWith(`.${action}`));
  }
  return [];
}

/**
 * Resolve a role's raw stored permissions (which may include wildcards)
 * into the count of effective literal permissions it grants, using the
 * given full permission catalog to expand wildcards.
 */
export function countEffectivePermissions(
  permissions: string[],
  allPermissions: string[]
): number {
  const effective = new Set<string>();
  for (const perm of permissions) {
    if (isWildcardPermission(perm)) {
      expandWildcard(perm, allPermissions).forEach((p) => effective.add(p));
    } else {
      effective.add(perm);
    }
  }
  return effective.size;
}
