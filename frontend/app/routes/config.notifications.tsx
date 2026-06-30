/**
 * Notifications Configuration Page
 *
 * Configure notification channels (SMTP, SMS, Webhooks) and templates
 * Uses ConfigPageLayout and shared components for visual consistency
 */

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { ConfigPageLayout } from "~/components/config/ConfigPageLayout";
import { ConfigFormField } from "~/components/config/ConfigFormField";
import { ConfigSection } from "~/components/config/ConfigSection";
import { ConfigLoadingState } from "~/components/config/ConfigLoadingState";
import { ConfigErrorState } from "~/components/config/ConfigErrorState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import type { NotificationTemplate } from "~/features/notifications/types/notifications.types";
import type { Template } from "~/features/templates/types/template.types";
import { TemplateList } from "~/features/templates/components/TemplateList";
import { TemplateEditor } from "~/components/notifications/TemplateEditor";
import { showToast } from "~/components/common/Toast";
import { useConfigForm } from "~/hooks/useConfigForm";
import { useConfigSave } from "~/hooks/useConfigSave";
import {
  getNotificationChannels,
  updateSMTPConfig,
  updateSMSConfig,
  updateWebhookConfig,
  testSMTPConnection,
  testWebhookConnection,
  type SMTPConfig,
  type SMSConfig,
  type WebhookConfig,
} from "~/lib/api/notifications.api";
import { z } from "zod";

export function meta() {
  return [
    { title: "Notificaciones - AiutoX ERP" },
    {
      name: "description",
      content: "Configura las notificaciones del sistema",
    },
  ];
}

export default function NotificationsConfigPage() {
  const { t } = useTranslation();
  const [editingTemplate, setEditingTemplate] =
    useState<NotificationTemplate | null>(null);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);

  // Load channels configuration
  const { data, isLoading, error } = useQuery({
    queryKey: ["config", "notifications", "channels"],
    queryFn: async () => {
      const response = await getNotificationChannels();
      return response.data;
    },
  });

  // SMTP Form
  const smtpDefaultValues: SMTPConfig = {
    enabled: false,
    host: "",
    port: 587,
    user: "",
    password: null,
    use_tls: true,
    from_email: "",
    from_name: "",
  };

  const smtpSchema = useMemo(
    () =>
      z.object({
        enabled: z.boolean(),
        host: z.string().min(1, t("config.notifications.smtpServerRequired")),
        port: z.number().min(1).max(65535),
        user: z.string().min(1, t("config.notifications.smtpUserRequired")),
        password: z.string().nullable().optional(),
        use_tls: z.boolean(),
        from_email: z
          .string()
          .email(t("config.notifications.fromEmailInvalid")),
        from_name: z
          .string()
          .min(1, t("config.notifications.fromNameRequired")),
      }),
    [t]
  );

  const smtpForm = useConfigForm<SMTPConfig>({
    initialValues: data?.smtp || smtpDefaultValues,
    schema: smtpSchema,
  });

  useEffect(() => {
    if (data?.smtp) {
      smtpForm.updateOriginalValues(data.smtp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.smtp]);

  const { save: saveSMTP, isSaving: isSavingSMTP } = useConfigSave<SMTPConfig>({
    queryKey: ["config", "notifications", "channels"],
    saveFn: async (values) => {
      const response = await updateSMTPConfig({
        enabled: values.enabled,
        host: values.host,
        port: values.port,
        user: values.user,
        password: values.password || null,
        use_tls: values.use_tls,
        from_email: values.from_email,
        from_name: values.from_name,
      });
      return response.data;
    },
    successMessage: t("config.notifications.saveSuccess"),
    errorMessage: t("config.notifications.errorSaving"),
    onSuccess: (updatedData) => {
      smtpForm.updateOriginalValues(updatedData);
    },
  });

  const testSMTPMutation = useMutation({
    mutationFn: testSMTPConnection,
    onSuccess: (response) => {
      if (response.data.success) {
        showToast(t("config.notifications.testSuccess"), "success");
      } else {
        showToast(
          response.data.message || t("config.notifications.testConnection"),
          "error"
        );
      }
    },
    onError: (error: Error) => {
      showToast(
        error.message || t("config.notifications.testConnection"),
        "error"
      );
    },
  });

  // SMS Form
  const smsDefaultValues: SMSConfig = {
    enabled: false,
    provider: "twilio",
    account_sid: null,
    auth_token: null,
    from_number: null,
  };

  const smsSchema = useMemo(
    () =>
      z.object({
        enabled: z.boolean(),
        provider: z.string().min(1),
        account_sid: z.string().nullable().optional(),
        auth_token: z.string().nullable().optional(),
        from_number: z.string().nullable().optional(),
      }),
    []
  );

  const smsForm = useConfigForm<SMSConfig>({
    initialValues: data?.sms || smsDefaultValues,
    schema: smsSchema,
  });

  useEffect(() => {
    if (data?.sms) {
      smsForm.updateOriginalValues(data.sms);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.sms]);

  const { save: saveSMS, isSaving: isSavingSMS } = useConfigSave<SMSConfig>({
    queryKey: ["config", "notifications", "channels"],
    saveFn: async (values) => {
      const response = await updateSMSConfig({
        enabled: values.enabled,
        provider: values.provider,
        account_sid: values.account_sid || null,
        auth_token: values.auth_token || null,
        from_number: values.from_number || null,
      });
      return response.data;
    },
    successMessage: t("config.notifications.saveSuccess"),
    errorMessage: t("config.notifications.errorSaving"),
    onSuccess: (updatedData) => {
      smsForm.updateOriginalValues(updatedData);
    },
  });

  // Webhook Form
  const webhookDefaultValues: WebhookConfig = {
    enabled: false,
    url: "",
    secret: null,
    timeout: 30,
  };

  const webhookSchema = useMemo(
    () =>
      z.object({
        enabled: z.boolean(),
        url: z.string().url(t("config.notifications.webhookUrlInvalid")),
        secret: z.string().nullable().optional(),
        timeout: z.number().min(1).max(300),
      }),
    [t]
  );

  const webhookForm = useConfigForm<WebhookConfig>({
    initialValues: data?.webhook || webhookDefaultValues,
    schema: webhookSchema,
  });

  useEffect(() => {
    if (data?.webhook) {
      webhookForm.updateOriginalValues(data.webhook);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.webhook]);

  const { save: saveWebhook, isSaving: isSavingWebhook } =
    useConfigSave<WebhookConfig>({
      queryKey: ["config", "notifications", "channels"],
      saveFn: async (values) => {
        const response = await updateWebhookConfig({
          enabled: values.enabled,
          url: values.url,
          secret: values.secret || null,
          timeout: values.timeout,
        });
        return response.data;
      },
      successMessage: t("config.notifications.saveSuccess"),
      errorMessage: t("config.notifications.errorSaving"),
      onSuccess: (updatedData) => {
        webhookForm.updateOriginalValues(updatedData);
      },
    });

  const testWebhookMutation = useMutation({
    mutationFn: testWebhookConnection,
    onSuccess: (response) => {
      if (response.data.success) {
        showToast(t("config.notifications.testSuccess"), "success");
      } else {
        showToast(
          response.data.message || t("config.notifications.testWebhook"),
          "error"
        );
      }
    },
    onError: (error: Error) => {
      showToast(
        error.message || t("config.notifications.testWebhook"),
        "error"
      );
    },
  });

  const handleSaveSMTP = async () => {
    if (smtpForm.validate()) {
      await saveSMTP(smtpForm.values);
    }
  };

  const handleSaveSMS = async () => {
    if (smsForm.validate()) {
      await saveSMS(smsForm.values);
    }
  };

  const handleSaveWebhook = async () => {
    if (webhookForm.validate()) {
      await saveWebhook(webhookForm.values);
    }
  };

  const handleTestSMTP = () => {
    testSMTPMutation.mutate();
  };

  const handleTestWebhook = () => {
    testWebhookMutation.mutate();
  };

  if (isLoading) {
    return (
      <ConfigPageLayout
        title={t("config.notifications.title")}
        description={t("config.notifications.description")}
        loading={true}
      >
        <ConfigLoadingState lines={6} />
      </ConfigPageLayout>
    );
  }

  if (error) {
    return (
      <ConfigPageLayout
        title={t("config.notifications.title")}
        description={t("config.notifications.description")}
        error={error instanceof Error ? error : String(error)}
      >
        <ConfigErrorState message={t("config.notifications.errorLoading")} />
      </ConfigPageLayout>
    );
  }

  return (
    <ConfigPageLayout
      title={t("config.notifications.title")}
      description={t("config.notifications.description")}
    >
      <Tabs defaultValue="channels" className="space-y-6">
        <TabsList>
          <TabsTrigger value="channels">
            {t("config.notifications.tabsChannels")}
          </TabsTrigger>
          <TabsTrigger value="templates">
            {t("config.notifications.tabsTemplates")}
          </TabsTrigger>
          <TabsTrigger value="preferences">
            {t("config.notifications.tabsPreferences")}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Canales */}
        <TabsContent value="channels" className="space-y-6">
          {/* SMTP */}
          <ConfigSection
            title={t("config.notifications.emailSMTP")}
            description={t("config.notifications.emailSMTPDesc")}
          >
            <div className="flex items-center space-x-2 pb-4">
              <Switch
                checked={smtpForm.values.enabled}
                onCheckedChange={(checked) =>
                  smtpForm.setValue("enabled", checked)
                }
                id="smtp_enabled"
              />
              <Label htmlFor="smtp_enabled">
                {t("config.notifications.enabled")}
              </Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ConfigFormField
                label={t("config.notifications.smtpServer")}
                id="smtp_host"
                value={smtpForm.values.host}
                onChange={(value) => smtpForm.setValue("host", value)}
                placeholder="smtp.example.com"
                error={smtpForm.errors.host}
                required
              />
              <ConfigFormField
                label={t("config.notifications.smtpPort")}
                id="smtp_port"
                type="number"
                value={String(smtpForm.values.port)}
                onChange={(value) =>
                  smtpForm.setValue("port", parseInt(value) || 587)
                }
                error={smtpForm.errors.port}
                required
              />
              <ConfigFormField
                label={t("config.notifications.smtpUser")}
                id="smtp_user"
                value={smtpForm.values.user}
                onChange={(value) => smtpForm.setValue("user", value)}
                error={smtpForm.errors.user}
                required
              />
              <ConfigFormField
                label={t("config.notifications.smtpPassword")}
                id="smtp_password"
                type="password"
                value={smtpForm.values.password || ""}
                onChange={(value) =>
                  smtpForm.setValue("password", value || null)
                }
                description={t("config.notifications.smtpPasswordPlaceholder")}
              />
              <ConfigFormField
                label={t("config.notifications.fromEmail")}
                id="smtp_from_email"
                type="email"
                value={smtpForm.values.from_email}
                onChange={(value) => smtpForm.setValue("from_email", value)}
                error={smtpForm.errors.from_email}
                required
              />
              <ConfigFormField
                label={t("config.notifications.fromName")}
                id="smtp_from_name"
                value={smtpForm.values.from_name}
                onChange={(value) => smtpForm.setValue("from_name", value)}
                error={smtpForm.errors.from_name}
                required
              />
            </div>
            <div className="flex items-center space-x-2 pt-4">
              <Switch
                checked={smtpForm.values.use_tls}
                onCheckedChange={(checked) =>
                  smtpForm.setValue("use_tls", checked)
                }
                id="smtp_use_tls"
              />
              <Label htmlFor="smtp_use_tls">
                {t("config.notifications.useTLS")}
              </Label>
            </div>
            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                onClick={handleTestSMTP}
                disabled={
                  testSMTPMutation.isPending || !smtpForm.values.enabled
                }
              >
                {testSMTPMutation.isPending
                  ? t("config.common.testing")
                  : t("config.notifications.testConnection")}
              </Button>
              <Button
                onClick={() => void handleSaveSMTP()}
                disabled={
                  !smtpForm.hasChanges || isSavingSMTP || !smtpForm.isValid
                }
              >
                {isSavingSMTP
                  ? t("config.common.saving")
                  : t("config.notifications.saveConfig")}
              </Button>
            </div>
          </ConfigSection>

          {/* SMS */}
          <ConfigSection
            title={t("config.notifications.sms")}
            description={t("config.notifications.smsDesc")}
          >
            <div className="flex items-center space-x-2 pb-4">
              <Switch
                checked={smsForm.values.enabled}
                onCheckedChange={(checked) =>
                  smsForm.setValue("enabled", checked)
                }
                id="sms_enabled"
              />
              <Label htmlFor="sms_enabled">
                {t("config.notifications.enabled")}
              </Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ConfigFormField
                label={t("config.notifications.smsAccountSid")}
                id="sms_account_sid"
                value={smsForm.values.account_sid || ""}
                onChange={(value) =>
                  smsForm.setValue("account_sid", value || null)
                }
              />
              <ConfigFormField
                label={t("config.notifications.smsAuthToken")}
                id="sms_auth_token"
                type="password"
                value={smsForm.values.auth_token || ""}
                onChange={(value) =>
                  smsForm.setValue("auth_token", value || null)
                }
              />
              <ConfigFormField
                label={t("config.notifications.smsFromNumber")}
                id="sms_from_number"
                value={smsForm.values.from_number || ""}
                onChange={(value) =>
                  smsForm.setValue("from_number", value || null)
                }
                placeholder={t("config.notifications.smsFromNumber")}
                className="md:col-span-2"
              />
            </div>
            <div className="flex gap-4 pt-4">
              <Button
                onClick={() => void handleSaveSMS()}
                disabled={
                  !smsForm.hasChanges || isSavingSMS || !smsForm.isValid
                }
              >
                {isSavingSMS
                  ? t("config.common.saving")
                  : t("config.notifications.saveConfig")}
              </Button>
            </div>
          </ConfigSection>

          {/* Webhooks */}
          <ConfigSection
            title={t("config.notifications.webhooks")}
            description={t("config.notifications.webhooksDesc")}
          >
            <div className="flex items-center space-x-2 pb-4">
              <Switch
                checked={webhookForm.values.enabled}
                onCheckedChange={(checked) =>
                  webhookForm.setValue("enabled", checked)
                }
                id="webhook_enabled"
              />
              <Label htmlFor="webhook_enabled">
                {t("config.notifications.enabled")}
              </Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ConfigFormField
                label={t("config.notifications.webhookUrl")}
                id="webhook_url"
                value={webhookForm.values.url}
                onChange={(value) => webhookForm.setValue("url", value)}
                placeholder={t("config.notifications.webhookUrlPlaceholder")}
                error={webhookForm.errors.url}
                required
                className="md:col-span-2"
              />
              <ConfigFormField
                label={t("config.notifications.webhookSecret")}
                id="webhook_secret"
                type="password"
                value={webhookForm.values.secret || ""}
                onChange={(value) =>
                  webhookForm.setValue("secret", value || null)
                }
              />
              <ConfigFormField
                label={t("config.notifications.webhookTimeout")}
                id="webhook_timeout"
                type="number"
                value={String(webhookForm.values.timeout)}
                onChange={(value) =>
                  webhookForm.setValue("timeout", parseInt(value) || 30)
                }
                error={webhookForm.errors.timeout}
                required
              />
            </div>
            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                onClick={handleTestWebhook}
                disabled={
                  testWebhookMutation.isPending || !webhookForm.values.enabled
                }
              >
                {testWebhookMutation.isPending
                  ? t("config.common.testing")
                  : t("config.notifications.testWebhook")}
              </Button>
              <Button
                onClick={() => void handleSaveWebhook()}
                disabled={
                  !webhookForm.hasChanges ||
                  isSavingWebhook ||
                  !webhookForm.isValid
                }
              >
                {isSavingWebhook
                  ? t("config.common.saving")
                  : t("config.notifications.saveConfig")}
              </Button>
            </div>
          </ConfigSection>
        </TabsContent>

        {/* Tab: Plantillas */}
        <TabsContent value="templates">
          {showTemplateEditor ? (
            <TemplateEditor
              template={editingTemplate}
              onSuccess={() => {
                setShowTemplateEditor(false);
                setEditingTemplate(null);
              }}
              onCancel={() => {
                setShowTemplateEditor(false);
                setEditingTemplate(null);
              }}
            />
          ) : (
            <TemplateList
              onEdit={(template: Template) => {
                // Convert back to NotificationTemplate if needed
                setEditingTemplate(template as unknown as NotificationTemplate);
                setShowTemplateEditor(true);
              }}
              onCreate={() => {
                setEditingTemplate(null);
                setShowTemplateEditor(true);
              }}
              templates={[]} // TODO: Load and convert notification templates
              loading={false}
            />
          )}
        </TabsContent>

        {/* Tab: Preferencias */}
        <TabsContent value="preferences">
          <ConfigSection
            title={t("config.notifications.preferencesTitle")}
            description={t("config.notifications.preferencesDesc")}
          >
            <p className="text-muted-foreground">
              {t("config.notifications.templatesComingSoon")}
            </p>
          </ConfigSection>
        </TabsContent>
      </Tabs>
    </ConfigPageLayout>
  );
}
