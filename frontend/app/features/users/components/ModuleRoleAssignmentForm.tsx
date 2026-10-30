/**
 * ModuleRoleAssignmentForm Component
 *
 * Assigns a module-internal role (e.g. internal.editor) to a user, for a
 * chosen business/core module.
 */

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { showToast } from "~/components/common/Toast";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Shield } from "lucide-react";
import {
  getModuleRolesCatalog,
  assignModuleRole,
} from "../api/roles.api";
import { translateModuleName } from "../utils/moduleNames";

interface ModuleRoleAssignmentFormProps {
  userId: string;
  onSuccess?: () => void;
}

export function ModuleRoleAssignmentForm({
  userId,
  onSuccess,
}: ModuleRoleAssignmentFormProps) {
  const { t } = useTranslation();
  const [catalog, setCatalog] = useState<Record<string, string[]>>({});
  const [selectedModule, setSelectedModule] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getModuleRolesCatalog().then((response) => {
      setCatalog(response.data);
    });
  }, []);

  const handleSubmit = async () => {
    if (!selectedModule || !selectedRole) return;
    setIsSubmitting(true);
    try {
      await assignModuleRole(userId, selectedModule, selectedRole);
      showToast(t("users.moduleRoleAssignSuccess"), "success");
      setSelectedModule("");
      setSelectedRole("");
      onSuccess?.();
    } catch {
      showToast(t("users.moduleRoleAssignError"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const moduleNames = Object.keys(catalog).sort();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">
          {t("users.moduleRoleAssignmentTitle")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("users.moduleRoleAssignmentDescription")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="module-role-module-select">
            {t("users.moduleRoleModuleLabel")}
          </Label>
          <Select
            value={selectedModule}
            onValueChange={(value) => {
              setSelectedModule(value);
              setSelectedRole("");
            }}
          >
            <SelectTrigger id="module-role-module-select">
              <SelectValue
                placeholder={t("users.moduleRoleSelectModule")}
              />
            </SelectTrigger>
            <SelectContent>
              {moduleNames.map((module) => (
                <SelectItem key={module} value={module}>
                  {translateModuleName(t, module)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="module-role-role-select">
            {t("users.moduleRoleRoleLabel")}
          </Label>
          <Select
            value={selectedRole}
            onValueChange={setSelectedRole}
            disabled={!selectedModule}
          >
            <SelectTrigger id="module-role-role-select">
              <SelectValue placeholder={t("users.moduleRoleSelectRole")} />
            </SelectTrigger>
            <SelectContent>
              {(catalog[selectedModule] ?? []).map((roleName) => (
                <SelectItem key={roleName} value={roleName}>
                  {roleName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        size="sm"
        onClick={() => void handleSubmit()}
        disabled={!selectedModule || !selectedRole || isSubmitting}
      >
        <Shield className="h-4 w-4 mr-2" />
        {t("users.moduleRoleAssignButton")}
      </Button>
    </div>
  );
}
