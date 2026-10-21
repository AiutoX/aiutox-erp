/**
 * Reporting Configuration Page
 *
 * Per-column visibility rules (REP-002 FR-7): pick a dataset, see its live
 * columns, restrict any column to an existing catalog permission.
 * Uses ConfigPageLayout/ConfigSection for visual consistency, following the
 * pattern in config.notifications.tsx.
 */

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { ConfigPageLayout } from "~/components/config/ConfigPageLayout";
import { ConfigSection } from "~/components/config/ConfigSection";
import { ConfigLoadingState } from "~/components/config/ConfigLoadingState";
import { ConfigErrorState } from "~/components/config/ConfigErrorState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { showToast } from "~/components/common/Toast";
import {
  listDataSources,
  listDataSourceColumns,
  listFieldPermissions,
  createFieldPermission,
  deleteFieldPermission,
  type FieldPermission,
} from "~/lib/api/reporting.api";
import { listAllPermissions } from "~/features/users/api/permissions.api";

export function meta() {
  return [
    { title: "Reportes - AiutoX ERP" },
    {
      name: "description",
      content: "Configura la visibilidad de columnas por permiso en reportes",
    },
  ];
}

export default function ReportingConfigPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedDataset, setSelectedDataset] = useState<string>("");
  const [pendingPermissionByColumn, setPendingPermissionByColumn] = useState<
    Record<string, string>
  >({});

  const dataSourcesQuery = useQuery({
    queryKey: ["config", "reporting", "data-sources"],
    queryFn: async () => (await listDataSources()).data,
  });

  const columnsQuery = useQuery({
    queryKey: ["config", "reporting", "columns", selectedDataset],
    queryFn: async () => (await listDataSourceColumns(selectedDataset)).data,
    enabled: !!selectedDataset,
  });

  const rulesQuery = useQuery({
    queryKey: ["config", "reporting", "field-permissions", selectedDataset],
    queryFn: async () => (await listFieldPermissions(selectedDataset)).data,
    enabled: !!selectedDataset,
  });

  const permissionsQuery = useQuery({
    queryKey: ["config", "reporting", "permissions-catalog"],
    queryFn: async () => (await listAllPermissions()).data.groups,
  });

  const createRuleMutation = useMutation({
    mutationFn: createFieldPermission,
    onSuccess: () => {
      showToast(t("config.reporting.ruleSaved"), "success");
      void queryClient.invalidateQueries({
        queryKey: ["config", "reporting", "field-permissions", selectedDataset],
      });
    },
    onError: (error: Error) => {
      showToast(error.message || t("config.reporting.ruleSaveError"), "error");
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: deleteFieldPermission,
    onSuccess: () => {
      showToast(t("config.reporting.ruleRemoved"), "success");
      void queryClient.invalidateQueries({
        queryKey: ["config", "reporting", "field-permissions", selectedDataset],
      });
    },
    onError: (error: Error) => {
      showToast(error.message || t("config.reporting.ruleRemoveError"), "error");
    },
  });

  const ruleByColumn = useMemo(() => {
    const map = new Map<string, FieldPermission>();
    for (const rule of rulesQuery.data ?? []) {
      map.set(rule.column_name, rule);
    }
    return map;
  }, [rulesQuery.data]);

  const permissionOptions = useMemo(
    () =>
      (permissionsQuery.data ?? []).flatMap((group) =>
        group.permissions.map((permission) => ({
          value: permission,
          label: permission,
        }))
      ),
    [permissionsQuery.data]
  );

  const isLoading =
    dataSourcesQuery.isLoading || (!!selectedDataset && columnsQuery.isLoading);
  const error = dataSourcesQuery.error || columnsQuery.error || rulesQuery.error;

  if (isLoading) {
    return (
      <ConfigPageLayout
        title={t("config.reporting.title")}
        description={t("config.reporting.description")}
        loading={true}
      >
        <ConfigLoadingState lines={6} />
      </ConfigPageLayout>
    );
  }

  if (error) {
    return (
      <ConfigPageLayout
        title={t("config.reporting.title")}
        description={t("config.reporting.description")}
        error={error instanceof Error ? error : String(error)}
      >
        <ConfigErrorState message={t("config.reporting.errorLoading")} />
      </ConfigPageLayout>
    );
  }

  return (
    <ConfigPageLayout
      title={t("config.reporting.title")}
      description={t("config.reporting.description")}
    >
      <ConfigSection
        title={t("config.reporting.columnVisibility")}
        description={t("config.reporting.columnVisibilityDesc")}
      >
        <div className="max-w-sm pb-6">
          <Select value={selectedDataset} onValueChange={setSelectedDataset}>
            <SelectTrigger id="dataset-picker">
              <SelectValue placeholder={t("config.reporting.selectDataset")} />
            </SelectTrigger>
            <SelectContent>
              {(dataSourcesQuery.data ?? []).map((source) => (
                <SelectItem key={source.type} value={source.type}>
                  {source.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedDataset && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("config.reporting.column")}</TableHead>
                <TableHead>{t("config.reporting.requiredPermission")}</TableHead>
                <TableHead className="text-right">
                  {t("config.reporting.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(columnsQuery.data ?? []).map((column) => {
                const existingRule = ruleByColumn.get(column.name);
                const pendingPermission =
                  pendingPermissionByColumn[column.name] ?? "";

                return (
                  <TableRow key={column.name}>
                    <TableCell>{column.name}</TableCell>
                    <TableCell>
                      {existingRule ? (
                        <Badge variant="secondary">
                          {existingRule.required_permission}
                        </Badge>
                      ) : (
                        <Select
                          value={pendingPermission}
                          onValueChange={(value) =>
                            setPendingPermissionByColumn((prev) => ({
                              ...prev,
                              [column.name]: value,
                            }))
                          }
                        >
                          <SelectTrigger
                            id={`permission-select-${column.name}`}
                            className="w-64"
                          >
                            <SelectValue
                              placeholder={t(
                                "config.reporting.noRestriction"
                              )}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {permissionOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {existingRule ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            deleteRuleMutation.mutate(existingRule.id)
                          }
                          disabled={deleteRuleMutation.isPending}
                        >
                          {t("config.reporting.removeRestriction")}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={
                            !pendingPermission || createRuleMutation.isPending
                          }
                          onClick={() =>
                            createRuleMutation.mutate({
                              dataset_type: selectedDataset,
                              column_name: column.name,
                              required_permission: pendingPermission,
                            })
                          }
                        >
                          {t("config.reporting.saveRestriction")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </ConfigSection>
    </ConfigPageLayout>
  );
}
