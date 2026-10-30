import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { modulesApi } from "../api/modules";
import { ModulesTable } from "./ModulesTable";
import { type ModuleInfo } from "../types/modules";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

export function ModulesPage() {
  const { t } = useTranslation();
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const [hardUninstallPending, setHardUninstallPending] = useState<string | null>(null);

  const loadModules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await modulesApi.listModules();
      setModules(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("admin.modules.messages.error")
      );
      console.error("Failed to load modules:", err);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const executeAction = async (moduleId: string, action: string) => {
    try {
      setActionLoading((prev) => ({ ...prev, [moduleId]: true }));
      setError(null);

      switch (action) {
        case "install":
          await modulesApi.installModule(moduleId);
          break;
        case "disable":
          await modulesApi.disableModule(moduleId);
          break;
        case "enable":
          await modulesApi.enableModule(moduleId);
          break;
        case "uninstall_request":
          await modulesApi.uninstallRequestModule(moduleId);
          break;
        case "reactivate":
          await modulesApi.reactivateModule(moduleId);
          break;
        case "export":
          await modulesApi.exportModule(moduleId);
          break;
        case "hard_uninstall":
          await modulesApi.hardUninstallModule(moduleId);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      await loadModules();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("admin.modules.messages.error")
      );
      console.error(`Failed to perform action ${action}:`, err);
    } finally {
      setActionLoading((prev) => ({
        ...prev,
        [moduleId]: false,
      }));
    }
  };

  const handleAction = (moduleId: string, action: string) => {
    if (action === "hard_uninstall") {
      setHardUninstallPending(moduleId);
      return;
    }
    executeAction(moduleId, action);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("admin.modules.title")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("admin.modules.description")}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.modules.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ModulesTable
            modules={modules}
            loading={loading}
            onRefresh={loadModules}
            onAction={handleAction}
            actionLoading={actionLoading}
          />
        </CardContent>
      </Card>

      <AlertDialog
        open={hardUninstallPending !== null}
        onOpenChange={(open) => {
          if (!open) setHardUninstallPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin.modules.confirmDialogs.hardUninstall.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.modules.confirmDialogs.hardUninstall.description").replace(
                "{module}",
                hardUninstallPending ?? ""
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("admin.modules.confirmDialogs.hardUninstall.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (hardUninstallPending) {
                  executeAction(hardUninstallPending, "hard_uninstall");
                  setHardUninstallPending(null);
                }
              }}
            >
              {t("admin.modules.confirmDialogs.hardUninstall.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
