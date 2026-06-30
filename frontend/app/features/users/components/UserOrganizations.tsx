/**
 * UserOrganizations Component
 *
 * Manages organizations associated with a user
 */

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Plus, X } from "lucide-react";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { useOrganizations } from "../hooks/useOrganizations";
import type { User } from "../types/user.types";

interface UserOrganizationsProps {
  user: User;
  onUpdate?: () => void;
}

/**
 * UserOrganizations component
 *
 * Note: Backend may need endpoints to associate/disassociate organizations with users
 * For now, this component displays organizations that might be related
 */
export function UserOrganizations({ user, onUpdate }: UserOrganizationsProps) {
  const { t } = useTranslation();
  const { organizations, loading } = useOrganizations();
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>(
    []
  );

  // Filter organizations by tenant
  const userOrganizations = organizations.filter(
    (org) => org.tenant_id === user.tenant_id
  );

  // const handleAddOrganization = (organizationId: string) => {
  //   if (!selectedOrganizations.includes(organizationId)) {
  //     setSelectedOrganizations([...selectedOrganizations, organizationId]);
  //     // TODO: Call API to associate organization with user
  //     onUpdate?.();
  //   }
  // };

  const handleRemoveOrganization = (organizationId: string) => {
    setSelectedOrganizations(
      selectedOrganizations.filter((id) => id !== organizationId)
    );
    // TODO: Call API to disassociate organization from user
    onUpdate?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner
          size="md"
          text={t("users.loadingOrganizations") || "Cargando organizaciones..."}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Organizaciones</h3>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Asociar Organización
        </Button>
      </div>

      {userOrganizations.length === 0 ? (
        <div className="rounded-md border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No hay organizaciones disponibles
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {userOrganizations.map((org) => (
            <div
              key={org.id}
              className="flex items-center justify-between rounded-md border p-4"
            >
              <div>
                <p className="font-medium">{org.name}</p>
                {org.legal_name && (
                  <p className="text-sm text-muted-foreground">
                    {org.legal_name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground capitalize">
                  {org.organization_type}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveOrganization(org.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
