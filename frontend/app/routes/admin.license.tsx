import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "~/components/layout/PageLayout";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import {
  activateLicense,
  getMyLicense,
  revokeLicense,
} from "~/lib/api/licenses.api";

export function meta() {
  return [{ title: "License — AiutoX ERP" }];
}

export default function AdminLicenseRoute() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tokenInput, setTokenInput] = useState("");

  const { data: licenseData, isLoading } = useQuery({
    queryKey: ["license", "me"],
    queryFn: getMyLicense,
  });

  const license = licenseData?.data;

  const activateMutation = useMutation({
    mutationFn: () => activateLicense(tokenInput),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["license", "me"] });
      setTokenInput("");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (jti: string) => revokeLicense(jti),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["license", "me"] });
    },
  });

  return (
    <PageLayout
      title={t("license.title")}
      breadcrumb={[{ label: "Admin" }, { label: t("license.title") }]}
    >
      <div className="space-y-6">
        {/* Current license status */}
        <Card>
          <CardHeader>
            <CardTitle>{t("license.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-muted-foreground">{t("common.loading")}</p>
            ) : license?.is_active ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Badge variant="default">{t("license.status.active")}</Badge>
                  {license.expires_at && (
                    <span className="text-sm text-muted-foreground">
                      {t("license.expiresAt")}:{" "}
                      {new Date(license.expires_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">{t("license.modules")}</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(license.modules).map(([mod, tier]) => (
                      <Badge key={mod} variant="outline">
                        {mod}: {String(tier)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={revokeMutation.isPending}
                    onClick={() => {
                      if (
                        license.license_jti &&
                        confirm(t("license.revoke.confirm"))
                      ) {
                        revokeMutation.mutate(license.license_jti);
                      }
                    }}
                  >
                    {t("license.revoke.submit")}
                  </Button>
                </div>
              </div>
            ) : (
              <Badge variant="secondary">{t("license.status.none")}</Badge>
            )}
          </CardContent>
        </Card>

        {/* Activate new license */}
        <Card>
          <CardHeader>
            <CardTitle>{t("license.activate.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="token">{t("license.activate.label")}</Label>
              <Textarea
                id="token"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder={t("license.activate.placeholder")}
                rows={5}
                className="font-mono text-xs mt-1"
              />
            </div>

            {activateMutation.isError && (
              <p className="text-sm text-destructive">
                {t("license.activate.error")}
              </p>
            )}
            {activateMutation.isSuccess && (
              <p className="text-sm text-green-600">
                {t("license.activate.success")}
              </p>
            )}

            <Button
              disabled={!tokenInput.trim() || activateMutation.isPending}
              onClick={() => activateMutation.mutate()}
            >
              {t("license.activate.submit")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
