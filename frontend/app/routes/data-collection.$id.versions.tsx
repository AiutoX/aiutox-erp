/**
 * Data Collection — Form Version Diff Viewer
 * Route: /data-collection/:id/versions
 * RBAC: requires data_collection.forms.view
 */

import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { ProtectedRoute } from "~/components/auth/ProtectedRoute";
import { PageLayout } from "~/components/layout/PageLayout";
import { VersionDiffViewer } from "~/features/data_collection/components/versions/VersionDiffViewer";
import { listFormVersions } from "~/features/data_collection/api/data_collection.api";
import type { DCFormVersion } from "~/features/data_collection/types/data_collection.types";

export function meta() {
  return [{ title: "Version History - Data Collection - AiutoX ERP" }];
}

export default function FormVersionsPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();

  const [versionA, setVersionA] = useState<DCFormVersion | null>(null);
  const [versionB, setVersionB] = useState<DCFormVersion | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["data_collection", "forms", id, "versions"],
    queryFn: () => listFormVersions(id!),
    enabled: Boolean(id),
    select: (res) => res.data ?? [],
  });

  const versions: DCFormVersion[] = data ?? [];

  if (!id) return null;

  return (
    <ProtectedRoute>
      <PageLayout
        title={t("data_collection.versions.title") ?? "Form Version History"}
        description={
          t("data_collection.versions.description") ??
          "Select two versions to compare."
        }
      >
        {isLoading && (
          <p className="text-sm text-muted-foreground">
            {t("common.loading") ?? "Loading versions…"}
          </p>
        )}

        {isError && (
          <p className="text-sm text-destructive">
            {t("common.error.load") ?? "Failed to load versions"}
          </p>
        )}

        {!isLoading && versions.length > 0 && (
          <div className="space-y-6">
            {/* Version selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium">
                  {t("data_collection.versions.versionA") ?? "Version A (base)"}
                </label>
                <select
                  className="w-full text-sm border rounded px-2 py-1.5"
                  value={versionA?.id ?? ""}
                  onChange={(e) => {
                    const v = versions.find((v) => v.id === e.target.value) ?? null;
                    setVersionA(v);
                  }}
                >
                  <option value="">
                    {t("data_collection.versions.selectVersion") ?? "Select version…"}
                  </option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.versionNumber} —{" "}
                      {new Date(v.createdAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">
                  {t("data_collection.versions.versionB") ?? "Version B (compare)"}
                </label>
                <select
                  className="w-full text-sm border rounded px-2 py-1.5"
                  value={versionB?.id ?? ""}
                  onChange={(e) => {
                    const v = versions.find((v) => v.id === e.target.value) ?? null;
                    setVersionB(v);
                  }}
                >
                  <option value="">
                    {t("data_collection.versions.selectVersion") ?? "Select version…"}
                  </option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.versionNumber} —{" "}
                      {new Date(v.createdAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Diff viewer */}
            {versionA && versionB && versionA.id !== versionB.id ? (
              <VersionDiffViewer
                formId={id}
                versionIdA={versionA.id}
                versionIdB={versionB.id}
                versionNumberA={versionA.versionNumber}
                versionNumberB={versionB.versionNumber}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("data_collection.versions.selectBoth") ??
                  "Select two different versions above to see the diff."}
              </p>
            )}
          </div>
        )}

        {!isLoading && versions.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t("data_collection.versions.noVersions") ?? "No versions available yet."}
          </p>
        )}
      </PageLayout>
    </ProtectedRoute>
  );
}
