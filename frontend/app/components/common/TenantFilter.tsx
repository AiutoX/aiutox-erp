/**
 * TenantFilter Component
 *
 * Selector for filtering by tenant (for users with access to multiple tenants)
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { useAuthStore } from "~/stores/authStore";

interface TenantFilterProps {
  selectedTenantId?: string;
  onTenantChange: (tenantId: string | null) => void;
  availableTenants?: Array<{ id: string; name: string }>;
  label?: string;
}

/**
 * TenantFilter component
 *
 * Note: In a full implementation, this would fetch available tenants
 * from the backend. For now, it uses the current user's tenant.
 */
export function TenantFilter({
  selectedTenantId,
  onTenantChange,
  availableTenants,
  label = "Tenant",
}: TenantFilterProps) {
  const currentUser = useAuthStore((state) => state.user);
  const currentTenantId = currentUser?.tenant_id;

  // If no available tenants provided, use current tenant
  const tenants =
    availableTenants ||
    (currentTenantId ? [{ id: currentTenantId, name: "Tenant Actual" }] : []);

  const handleChange = (value: string) => {
    if (value === "all") {
      onTenantChange(null);
    } else {
      onTenantChange(value);
    }
  };

  if (tenants.length <= 1) {
    // Don't show filter if user only has access to one tenant
    return null;
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="tenant-filter">{label}</Label>
      <Select value={selectedTenantId || "all"} onValueChange={handleChange}>
        <SelectTrigger id="tenant-filter" className="w-[200px]">
          <SelectValue placeholder="Seleccionar tenant" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los Tenants</SelectItem>
          {tenants.map((tenant) => (
            <SelectItem key={tenant.id} value={tenant.id}>
              {tenant.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
