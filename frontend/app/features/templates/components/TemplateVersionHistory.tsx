/**
 * TemplateVersionHistory component
 * Displays version history for a template
 */

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import type { TemplateVersion } from "~/features/templates/types/template.types";

interface TemplateVersionHistoryProps {
  versions: TemplateVersion[];
  loading?: boolean;
  onRestore?: (version: TemplateVersion) => void;
  onCompare?: (version1: TemplateVersion, version2: TemplateVersion) => void;
}

export function TemplateVersionHistory({
  versions,
  loading,
  onRestore,
  onCompare,
}: TemplateVersionHistoryProps) {
  const { t } = useTranslation();
  const dateLocale = es;
  const [selectedVersions, setSelectedVersions] = useState<TemplateVersion[]>(
    []
  );

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "PPP", { locale: dateLocale });
  };

  const handleVersionSelect = (version: TemplateVersion) => {
    if (selectedVersions.find((v) => v.id === version.id)) {
      setSelectedVersions((prev) => prev.filter((v) => v.id !== version.id));
    } else {
      if (selectedVersions.length < 2) {
        setSelectedVersions((prev) => [...prev, version]);
      }
    }
  };

  const handleCompare = () => {
    if (selectedVersions.length === 2 && onCompare) {
      const [version1, version2] = selectedVersions;
      if (version1 && version2) {
        onCompare(version1, version2);
      }
    }
  };

  const handleRestore = (version: TemplateVersion) => {
    if (onRestore) {
      onRestore(version);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary" />
            <span>{t("templates.versions.loading")}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!versions.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">
            {t("templates.versions.noVersions")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {t("templates.versions.title")}
        </h3>
        <div className="flex space-x-2">
          {selectedVersions.length === 2 && (
            <Button onClick={handleCompare} variant="outline">
              {t("templates.versions.compare")}
            </Button>
          )}
          <Button
            onClick={() => setSelectedVersions([])}
            variant="outline"
            disabled={selectedVersions.length === 0}
          >
            {t("templates.versions.clearSelection")}
          </Button>
        </div>
      </div>

      {/* Versions List */}
      <div className="space-y-3">
        {versions.map((version) => (
          <Card
            key={version.id}
            className={`cursor-pointer transition-colors ${
              selectedVersions.find((v) => v.id === version.id)
                ? "ring-2 ring-primary"
                : "hover:bg-muted/50"
            }`}
            onClick={() => handleVersionSelect(version)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {t("templates.versions.version")} {version.version}
                    </span>
                    <Badge variant="outline">{version.name}</Badge>
                    {selectedVersions.find((v) => v.id === version.id) && (
                      <Badge variant="default">
                        {t("templates.versions.selected")}
                      </Badge>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {t("templates.versions.createdBy")} {version.created_by}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("templates.versions.createdAt")}{" "}
                    {formatDate(version.created_at)}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {version.variables.slice(0, 5).map((variable: string) => (
                      <span
                        key={variable}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
                      >
                        {variable}
                      </span>
                    ))}
                    {version.variables.length > 5 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                        +{version.variables.length - 5}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRestore(version);
                    }}
                  >
                    {t("templates.versions.restore")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comparison View */}
      {selectedVersions.length === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("templates.versions.comparison")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              {selectedVersions.map((version) => (
                <div key={version.id} className="space-y-2">
                  <h4 className="font-medium">
                    {t("templates.versions.version")} {version.version}
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <strong>{t("templates.subject")}:</strong>
                      <div className="text-sm text-muted-foreground">
                        {version.subject || "N/A"}
                      </div>
                    </div>
                    <div>
                      <strong>{t("templates.content")}:</strong>
                      <div className="text-sm text-muted-foreground max-h-32 overflow-y-auto">
                        {version.content}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
