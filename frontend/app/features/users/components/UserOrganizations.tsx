/**
 * UserOrganizations Component
 *
 * Shows the tenant this user belongs to.
 * Users belong to exactly one tenant (User.tenant_id is non-nullable),
 * so this displays that single tenant rather than a CRM organizations list.
 */

import { Building2 } from "lucide-react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import type { User } from "../types/user.types";

interface UserOrganizationsProps {
  user: User;
  onUpdate?: () => void;
}

export function UserOrganizations({ user }: UserOrganizationsProps) {
  const { t } = useTranslation();
  const tenantName = user.tenant_name || t("users.organizationsUnknownTenant");

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{t("users.organizations")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("users.organizationsDescription")}
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-md border p-4">
        <Building2 className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-xs text-muted-foreground">
            {t("users.organizationsCurrentTenant")}
          </p>
          <p className="font-medium">{tenantName}</p>
        </div>
      </div>
    </div>
  );
}
