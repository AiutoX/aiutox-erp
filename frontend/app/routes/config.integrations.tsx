/**
 * Integrations Configuration Page
 *
 * Manage external integrations (Stripe, Twilio, Google Calendar, Slack, Zapier, Webhooks)
 * Uses ConfigPageLayout and shared components for visual consistency
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "~/lib/i18n/useTranslation";
import {
  listIntegrations,
  activateIntegration,
  deactivateIntegration,
  testIntegration,
  deleteIntegration,
  createIntegration,
  type Integration,
  type IntegrationCreate,
} from "~/lib/api/integrations.api";
import { ConfigPageLayout } from "~/components/config/ConfigPageLayout";
import { ConfigLoadingState } from "~/components/config/ConfigLoadingState";
import { ConfigErrorState } from "~/components/config/ConfigErrorState";
import { ConfigEmptyState } from "~/components/config/ConfigEmptyState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
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
import { showToast } from "~/components/common/Toast";
import { PlugIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export function meta() {
  return [
    { title: "Integraciones - AiutoX ERP" },
    { name: "description", content: "Conecta AiutoX con servicios externos" },
  ];
}

// Note: AVAILABLE_INTEGRATIONS moved inside component to use translations
const getAvailableIntegrations = (t: (key: string) => string) =>
  [
    {
      id: "stripe",
      name: t("config.integrations.stripeName"),
      description: t("config.integrations.stripeDesc"),
    },
    {
      id: "twilio",
      name: t("config.integrations.twilioName"),
      description: t("config.integrations.twilioDesc"),
    },
    {
      id: "google-calendar",
      name: t("config.integrations.googleCalendarName"),
      description: t("config.integrations.googleCalendarDesc"),
    },
    {
      id: "slack",
      name: t("config.integrations.slackName"),
      description: t("config.integrations.slackDesc"),
    },
    {
      id: "zapier",
      name: t("config.integrations.zapierName"),
      description: t("config.integrations.zapierDesc"),
    },
    {
      id: "webhook",
      name: t("config.integrations.webhookName"),
      description: t("config.integrations.webhookDesc"),
    },
  ] as const;

export default function IntegrationsConfigPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] =
    useState<Integration | null>(null);
  const [integrationToDelete, setIntegrationToDelete] =
    useState<Integration | null>(null);
  const [configFormData, setConfigFormData] = useState<Record<string, string>>(
    {}
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => listIntegrations(),
  });

  const integrations = data?.data || [];
  const configured = integrations.filter((i) => i.status !== "pending");
  const availableIntegrations = getAvailableIntegrations(t);
  const available = availableIntegrations.filter(
    (ai) => !integrations.some((i) => i.type === ai.id)
  );

  const activateMutation = useMutation({
    mutationFn: ({
      integrationId,
      config,
    }: {
      integrationId: string;
      config: Record<string, unknown>;
    }) => activateIntegration(integrationId, { config }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integrations"] });
      showToast(t("config.integrations.activateSuccess"), "success");
      setConfigDialogOpen(false);
      setSelectedIntegration(null);
      setConfigFormData({});
    },
    onError: (error: Error) => {
      showToast(
        error.message || t("config.integrations.errorActivating"),
        "error"
      );
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (integrationId: string) => deactivateIntegration(integrationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integrations"] });
      showToast(t("config.integrations.deactivateSuccess"), "success");
    },
    onError: (error: Error) => {
      showToast(
        error.message || t("config.integrations.errorDeactivating"),
        "error"
      );
    },
  });

  const testMutation = useMutation({
    mutationFn: (integrationId: string) => testIntegration(integrationId),
    onSuccess: (response) => {
      if (response.data.success) {
        showToast(t("config.integrations.testSuccess"), "success");
      } else {
        showToast(
          response.data.message || t("config.integrations.testError"),
          "error"
        );
      }
    },
    onError: (error: Error) => {
      showToast(error.message || t("config.integrations.testError"), "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (integrationId: string) => deleteIntegration(integrationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integrations"] });
      showToast(t("config.integrations.deleteSuccess"), "success");
      setDeleteDialogOpen(false);
      setIntegrationToDelete(null);
    },
    onError: (error: Error) => {
      showToast(error.message || t("config.integrations.deleteError"), "error");
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: IntegrationCreate) => createIntegration(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integrations"] });
      showToast(t("config.integrations.createSuccess"), "success");
      setConfigDialogOpen(false);
      setSelectedIntegration(null);
      setConfigFormData({});
    },
    onError: (error: Error) => {
      showToast(error.message || t("config.integrations.createError"), "error");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-50 text-green-700 border-green-200">
            {t("config.integrations.statusActive")}
          </Badge>
        );
      case "inactive":
        return (
          <Badge variant="secondary">
            {t("config.integrations.statusInactive")}
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive">
            {t("config.integrations.statusError")}
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline">
            {t("config.integrations.statusPending")}
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleConfigure = (
    integration: (typeof availableIntegrations)[number]
  ) => {
    setSelectedIntegration({
      id: "",
      tenant_id: "",
      name: integration.name,
      type: integration.id,
      status: "pending",
      config: {},
      last_sync_at: null,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setConfigFormData({});
    setConfigDialogOpen(true);
  };

  const handleActivate = (integration: Integration) => {
    if (integration.status === "active") {
      deactivateMutation.mutate(integration.id);
    } else {
      setSelectedIntegration(integration);
      setConfigFormData((integration.config as Record<string, string>) || {});
      setConfigDialogOpen(true);
    }
  };

  const handleTest = (integration: Integration) => {
    testMutation.mutate(integration.id);
  };

  const handleDelete = (integration: Integration) => {
    setIntegrationToDelete(integration);
    setDeleteDialogOpen(true);
  };

  const handleSaveConfig = () => {
    if (!selectedIntegration) return;

    if (selectedIntegration.id) {
      // Activate existing integration
      activateMutation.mutate({
        integrationId: selectedIntegration.id,
        config: configFormData,
      });
    } else {
      // Create new integration
      createMutation.mutate({
        name: selectedIntegration.name,
        type: selectedIntegration.type,
        config: configFormData,
      });
    }
  };

  const getConfigFields = (type: string) => {
    switch (type) {
      case "stripe":
        return [
          {
            key: "api_key",
            label: t("config.integrations.apiKey"),
            type: "password",
          },
          {
            key: "webhook_secret",
            label: t("config.integrations.webhookSecret"),
            type: "password",
          },
        ];
      case "twilio":
        return [
          {
            key: "account_sid",
            label: t("config.integrations.accountSid"),
            type: "text",
          },
          {
            key: "auth_token",
            label: t("config.integrations.authToken"),
            type: "password",
          },
          {
            key: "from_number",
            label: t("config.integrations.fromNumber"),
            type: "text",
            placeholder: t("config.integrations.fromNumberPlaceholder"),
          },
        ];
      case "google-calendar":
        return [
          {
            key: "client_id",
            label: t("config.integrations.clientId"),
            type: "text",
          },
          {
            key: "client_secret",
            label: t("config.integrations.clientSecret"),
            type: "password",
          },
        ];
      case "slack":
        return [
          {
            key: "webhook_url",
            label: t("config.integrations.webhookUrl"),
            type: "url",
          },
        ];
      case "zapier":
        return [
          {
            key: "api_key",
            label: t("config.integrations.apiKey"),
            type: "password",
          },
        ];
      case "webhook":
        return [
          {
            key: "url",
            label: t("config.integrations.webhookUrl"),
            type: "url",
          },
          {
            key: "secret",
            label: t("config.integrations.webhookSecret"),
            type: "password",
          },
        ];
      default:
        return [];
    }
  };

  if (isLoading) {
    return (
      <ConfigPageLayout
        title={t("config.integrations.title")}
        description={t("config.integrations.description")}
        loading={true}
      >
        <ConfigLoadingState lines={6} />
      </ConfigPageLayout>
    );
  }

  if (error) {
    return (
      <ConfigPageLayout
        title={t("config.integrations.title")}
        description={t("config.integrations.description")}
        error={error instanceof Error ? error : String(error)}
      >
        <ConfigErrorState message={t("config.integrations.errorLoading")} />
      </ConfigPageLayout>
    );
  }

  return (
    <ConfigPageLayout
      title={t("config.integrations.title")}
      description={t("config.integrations.description")}
    >
      <Tabs defaultValue="configured" className="space-y-6">
        <TabsList>
          <TabsTrigger value="configured">
            {t("config.integrations.tabsConfigured")} ({configured.length})
          </TabsTrigger>
          <TabsTrigger value="available">
            {t("config.integrations.tabsAvailable")} ({available.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configured">
          {configured.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {configured.map((integration) => (
                <Card
                  key={integration.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HugeiconsIcon
                          icon={PlugIcon}
                          size={24}
                          className="text-muted-foreground"
                        />
                        <CardTitle>{integration.name}</CardTitle>
                      </div>
                      {getStatusBadge(integration.status)}
                    </div>
                    <CardDescription>{integration.type}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {integration.last_sync_at && (
                      <p className="text-sm text-muted-foreground">
                        {t("config.integrations.lastSync")}:{" "}
                        {new Date(integration.last_sync_at).toLocaleString()}
                      </p>
                    )}
                    {integration.error_message && (
                      <p className="text-sm text-destructive">
                        {integration.error_message}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTest(integration)}
                        disabled={testMutation.isPending}
                      >
                        {testMutation.isPending
                          ? t("config.common.testing")
                          : t("config.integrations.test")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleActivate(integration)}
                        disabled={
                          activateMutation.isPending ||
                          deactivateMutation.isPending
                        }
                      >
                        {integration.status === "active"
                          ? t("config.integrations.deactivate")
                          : t("config.integrations.activate")}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(integration)}
                        disabled={deleteMutation.isPending}
                      >
                        {t("config.integrations.delete")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <ConfigEmptyState
              title={t("config.integrations.noIntegrations")}
              description={t("config.integrations.noIntegrationsDesc")}
            />
          )}
        </TabsContent>

        <TabsContent value="available">
          {available.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {available.map((integration) => (
                <Card
                  key={integration.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon
                        icon={PlugIcon}
                        size={24}
                        className="text-muted-foreground"
                      />
                      <CardTitle>{integration.name}</CardTitle>
                    </div>
                    <CardDescription>{integration.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={() => handleConfigure(integration)}>
                      {t("config.integrations.configure")}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <ConfigEmptyState
              title={t("config.integrations.allConfigured")}
              description={t("config.integrations.allConfiguredDesc")}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {t("config.integrations.configDialogTitle")}{" "}
              {selectedIntegration?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedIntegration
                ? availableIntegrations.find(
                    (i) => i.id === selectedIntegration.type
                  )?.description || selectedIntegration.name
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {selectedIntegration &&
              getConfigFields(selectedIntegration.type).map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Input
                    id={field.key}
                    type={
                      field.type === "password"
                        ? "password"
                        : field.type === "url"
                          ? "url"
                          : "text"
                    }
                    value={configFormData[field.key] || ""}
                    onChange={(e) =>
                      setConfigFormData({
                        ...configFormData,
                        [field.key]: e.target.value,
                      })
                    }
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfigDialogOpen(false)}
            >
              {t("config.common.cancel")}
            </Button>
            <Button
              onClick={handleSaveConfig}
              disabled={activateMutation.isPending || createMutation.isPending}
            >
              {activateMutation.isPending || createMutation.isPending
                ? t("config.common.saving")
                : selectedIntegration?.id
                  ? t("config.integrations.activate")
                  : t("config.integrations.configure")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("config.integrations.deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {integrationToDelete
                ? `${t("config.integrations.deleteConfirmMessage")} ${integrationToDelete.name}`
                : t("config.integrations.deleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("config.common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                integrationToDelete &&
                deleteMutation.mutate(integrationToDelete.id)
              }
              className="bg-red-600 hover:bg-red-700"
            >
              {t("config.integrations.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfigPageLayout>
  );
}
