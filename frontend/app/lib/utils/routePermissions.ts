/**
 * Utility to map routes to required permissions
 * Used for intelligent redirect after login
 */

/**
 * Maps route paths to their required permissions
 * This allows the system to check if a user has permission to access a route
 * before redirecting them after login
 */
export const ROUTE_PERMISSIONS: Record<string, string | null> = {
  "/": null, // Dashboard - no special permission required (just authenticated)
  "/dashboard": null, // Dashboard - no special permission required
  "/users": "users.view",
  "/users/:id": "users.view",
  "/users/:id/roles": "auth.manage_roles",
  "/users/:id/permissions": "auth.manage_permissions",
  "/files": "files.view",
  "/calendar": "calendar.view",
  "/calendar-create": "calendar.events.manage",
  "/tasks": "tasks.view",
  "/tasks/:id": "tasks.view",
  "/tasks/:id/edit": "tasks.edit",
  "/tasks/settings": "tasks.manage",
  "/approvals": "approvals.view",
  "/approvals/:id": "approvals.view",
  "/automation": "automation.view",
  "/automation/:id": "automation.view",
  "/automation/:id/edit": "automation.edit",
  "/pubsub": "pubsub.view",
  "/pubsub/streams/:streamId": "pubsub.view",
  "/pubsub/groups/:groupId": "pubsub.view",
  "/products": "products.view",
  "/products/:id": "products.view",
  "/products/:id/edit": "products.edit",
  "/products/:id/variants": "products.view",
  "/products/:id/barcodes": "products.view",
  "/search": "search.view",
  "/activities": "activities.view",
  // Config routes
  "/config/theme": "config.view_theme",
  "/config/modules": "config.view",
  "/config/general": "config.view",
  "/config/roles": "auth.manage_roles",
  "/config/notifications": "notifications.manage",
  "/config/integrations": "integrations.view",
  "/config/import-export": "import_export.view",
  "/config/audit": "auth.view_audit",
  "/config/files": "system.configure",
  "/config/tenants": "*",
  "/config/automation": "ai.config",
  "/config/automation/analytics": "ai.config",
  "/config/automation/digests": "ai.use",
  "/config/automation/agents": "automation.read",
  // Add more routes as they are created
};

/**
 * Get the required permission for a route
 * @param route - The route path (e.g., "/users", "/users/123")
 * @returns The required permission string or null if no permission required
 */
export function getRoutePermission(route: string): string | null {
  // Remove query params and hash
  const cleanRoute = route?.split("?")[0]?.split("#")[0] || route;

  // Check exact match first
  const permission = ROUTE_PERMISSIONS[cleanRoute];
  if (permission) {
    return permission;
  }

  // Check pattern matches (e.g., "/users/:id" matches "/users/123")
  for (const [pattern, permission] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pattern?.includes(":") && permission) {
      // Convert pattern to regex
      const regexPattern = pattern
        .replace(/:[^/]+/g, "[^/]+") // Replace :id with [^/]+
        .replace(/\//g, "\\/"); // Escape slashes
      const regex = new RegExp(`^${regexPattern}$`);
      if (regex.test(cleanRoute || "")) {
        return permission;
      }
    }
  }

  // Default: no permission required (just authenticated)
  return null;
}

/**
 * Check if a route requires authentication only (no special permission)
 * @param route - The route path
 * @returns true if route only requires authentication
 */
export function isPublicRoute(route: string): boolean {
  const permission = getRoutePermission(route);
  return permission === null;
}

/**
 * Check if user has permission for a route
 * This is a helper function that doesn't use hooks, useful for checking permissions
 * after login before redirecting
 * @param route - The route path
 * @param userPermissions - Array of user permissions
 * @returns true if user has permission to access the route
 */
export function checkRoutePermission(
  route: string,
  userPermissions: string[] = []
): boolean {
  const requiredPermission = getRoutePermission(route);

  // If no permission required, user can access (just needs to be authenticated)
  if (requiredPermission === null) {
    return true;
  }

  // Check if user has the required permission
  const hasExactMatch = userPermissions.includes(requiredPermission);
  const hasWildcard = userPermissions.includes("*");
  const hasWildcardMatch = userPermissions.some((p) => {
    // Support full wildcard patterns (e.g., "*.*.*" matches everything)
    if (p === "*.*.*" || p === "*" || p === "*.*") {
      return true;
    }
    // Support module.* pattern (e.g., "users.*" matches "users.view")
    if (p.endsWith(".*")) {
      const module = p.slice(0, -2);
      return requiredPermission.startsWith(`${module}.`);
    }
    // Support *.*.action pattern (e.g., "*.*.view" matches "users.view", "products.view", etc.)
    if (p.startsWith("*.*.")) {
      const action = p.slice(4); // Remove "*.*."
      const requiredAction = requiredPermission.split(".").pop();
      return action === requiredAction;
    }
    // Support *.action pattern (e.g., "*.view" matches "users.view", "products.view", etc.)
    if (p.startsWith("*.")) {
      const action = p.slice(2); // Remove "*."
      const requiredAction = requiredPermission.split(".").pop();
      return action === requiredAction;
    }
    return false;
  });

  return hasExactMatch || hasWildcard || hasWildcardMatch;
}
