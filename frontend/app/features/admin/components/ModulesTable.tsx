import { useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { type ModuleInfo, type ModuleState } from "../types/modules";

interface ModulesTableProps {
  modules: ModuleInfo[];
  loading: boolean;
  onRefresh: () => void;
  onAction: (moduleId: string, action: string) => void;
  actionLoading: { [key: string]: boolean };
}

const stateColors: Record<ModuleState, "default" | "secondary" | "destructive"> = {
  not_installed: "secondary",
  installing: "default",
  active: "secondary",
  disabled: "secondary",
  grace_period: "destructive",
  exported: "secondary",
  uninstalled: "secondary",
};

const getAvailableActions = (state: ModuleState): string[] => {
  switch (state) {
    case "not_installed":
      return ["install"];
    case "active":
      return ["disable", "uninstall_request"];
    case "disabled":
      return ["enable", "uninstall_request"];
    case "grace_period":
      return ["reactivate", "export"];
    case "exported":
      return ["hard_uninstall"];
    default:
      return [];
  }
};

export function ModulesTable({
  modules,
  loading,
  onRefresh,
  onAction,
  actionLoading,
}: ModulesTableProps) {
  const { t } = useTranslation();
  const [selectedActions, setSelectedActions] = useState<{
    [key: string]: string;
  }>({});

  const handleActionChange = (moduleId: string, action: string) => {
    setSelectedActions((prev) => ({
      ...prev,
      [moduleId]: action,
    }));
  };

  const handleExecuteAction = (moduleId: string) => {
    const action = selectedActions[moduleId];
    if (action) {
      onAction(moduleId, action);
      setSelectedActions((prev) => {
        const newState = { ...prev };
        delete newState[moduleId];
        return newState;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p>{t("admin.modules.messages.loading")}</p>
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p>{t("admin.modules.messages.empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={onRefresh}>
          {t("admin.modules.buttons.refresh")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("admin.modules.table.module")}</TableHead>
            <TableHead>{t("admin.modules.table.version")}</TableHead>
            <TableHead>{t("admin.modules.table.tier")}</TableHead>
            <TableHead>{t("admin.modules.table.state")}</TableHead>
            <TableHead>{t("admin.modules.table.installedAt")}</TableHead>
            <TableHead>{t("admin.modules.table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {modules.map((module) => {
            const availableActions = getAvailableActions(module.state);
            const selectedAction = selectedActions[module.module];

            return (
              <TableRow key={module.module}>
                <TableCell className="font-medium">{module.module}</TableCell>
                <TableCell>{module.version}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {t(
                      `admin.modules.tiers.${module.tier}`
                    )}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={stateColors[module.state]}>
                    {t(`admin.modules.states.${module.state}`)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {module.installed_at ? (
                    <span>
                      {formatDistanceToNow(new Date(module.installed_at), {
                        addSuffix: true,
                      })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {availableActions.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedAction || ""}
                        onValueChange={(value: string) =>
                          handleActionChange(module.module, value)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Select action" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableActions.map((action) => {
                            const actionKey =
                              action === "uninstall_request"
                                ? "uninstallRequest"
                                : action === "hard_uninstall"
                                  ? "hardUninstall"
                                  : action;
                            return (
                              <SelectItem key={action} value={action}>
                                {t(`admin.modules.actions.${actionKey}`)}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        onClick={() => handleExecuteAction(module.module)}
                        disabled={!selectedAction || actionLoading[module.module]}
                      >
                        {actionLoading[module.module] ? "..." : "Go"}
                      </Button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      No actions available
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {modules.some((m) => m.state === "grace_period" && m.grace_deadline) && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm">
          <p className="font-medium text-destructive">
            {t("admin.modules.table.gracePeriod")}
          </p>
          <ul className="mt-2 space-y-1">
            {modules
              .filter((m) => m.state === "grace_period" && m.grace_deadline)
              .map((m) => (
                <li key={m.module}>
                  <strong>{m.module}</strong>:{" "}
                  {formatDistanceToNow(new Date(m.grace_deadline!), {
                    addSuffix: true,
                  })}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
