/**
 * Integration List Component
 * Displays list of integrations with management capabilities
 */

import { useState } from "react";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  PlugIcon,
  UploadIcon,
  DownloadIcon,
  ShieldIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  useIntegrations,
  useCreateIntegration,
  useDeleteIntegration,
  useActivateIntegration,
  useTestIntegration,
} from "~/features/integrations/hooks/useIntegrations";
import type { IntegrationCreate } from "~/features/integrations/types/integrations.types";

export function IntegrationList() {
  const {
    data: integrationsResponse,
    isLoading,
    error,
    refetch,
  } = useIntegrations();
  const createIntegration = useCreateIntegration();
  const deleteIntegration = useDeleteIntegration();
  const activateIntegration = useActivateIntegration();
  const testIntegration = useTestIntegration();

  const integrations = integrationsResponse?.data || [];
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const filteredIntegrations = integrations.filter((integration) => {
    const matchesSearch =
      integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      integration.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !typeFilter || integration.type === typeFilter;
    const matchesStatus = !statusFilter || integration.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleCreate = async () => {
    try {
      const newIntegration: IntegrationCreate = {
        name: "New Integration",
        type: "webhook",
        config: {
          url: "https://example.com/webhook",
          secret: "your-secret-key",
        },
      };

      await createIntegration.mutateAsync(newIntegration);
      refetch();
    } catch (error) {
      console.error("Error creating integration:", error);
    }
  };

  const handleActivate = async (integrationId: string) => {
    try {
      await activateIntegration.mutateAsync({
        integrationId,
        data: { config: {} },
      });
      refetch();
    } catch (error) {
      console.error("Error activating integration:", error);
    }
  };

  const handleTest = async (integrationId: string) => {
    try {
      await testIntegration.mutateAsync(integrationId);
      refetch();
    } catch (error) {
      console.error("Error testing integration:", error);
    }
  };

  const handleDelete = async (integrationId: string) => {
    if (confirm("Are you sure you want to delete this integration?")) {
      try {
        await deleteIntegration.mutateAsync(integrationId);
        refetch();
      } catch (error) {
        console.error("Error deleting integration:", error);
      }
    }
  };

  const getStatusBadge = (status: string): string => {
    switch (status) {
      case "active":
        return "bg-green-500 text-white";
      case "inactive":
        return "bg-gray-500 text-white";
      case "error":
        return "bg-red-500 text-white";
      case "pending":
        return "bg-yellow-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case "stripe":
        return "bg-purple-100 text-purple-800";
      case "twilio":
        return "bg-blue-100 text-blue-800";
      case "google-calendar":
        return "bg-orange-100 text-orange-800";
      case "slack":
        return "bg-pink-100 text-pink-800";
      case "zapier":
        return "bg-green-100 text-green-800";
      case "webhook":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case "stripe":
        return "💳";
      case "twilio":
        return "📱";
      case "google-calendar":
        return "📅";
      case "slack":
        return "💬";
      case "zapier":
        return "⚡";
      case "webhook":
        return "🔗";
      default:
        return "🔌";
    }
  };

  if (isLoading) {
    return (
      <PageLayout title="Integrations" loading>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
          <div className="h-20 bg-gray-200 rounded mb-4" />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="Integrations" error={error}>
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Error loading integrations</p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Integrations">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search integrations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="stripe">Stripe</option>
              <option value="twilio">Twilio</option>
              <option value="google-calendar">Google Calendar</option>
              <option value="slack">Slack</option>
              <option value="zapier">Zapier</option>
              <option value="webhook">Webhook</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg focus:ring-2 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="error">Error</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleCreate}>
              <HugeiconsIcon icon={PlugIcon} size={16} className="mr-2" />
              New Integration
            </Button>

            <Button onClick={() => refetch()}>
              <HugeiconsIcon icon={DownloadIcon} size={16} className="mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-600">
                {integrations.length}
              </div>
              <p className="text-sm text-gray-600">Total integrations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {integrations.filter((i) => i.status === "active").length}
              </div>
              <p className="text-sm text-gray-600">Active integrations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inactive</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-600">
                {integrations.filter((i) => i.status === "inactive").length}
              </div>
              <p className="text-sm text-gray-600">Inactive integrations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {integrations.filter((i) => i.status === "error").length}
              </div>
              <p className="text-sm text-gray-600">Integrations with errors</p>
            </CardContent>
          </Card>
        </div>

        {/* Integrations List */}
        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredIntegrations.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No integrations found</p>
                <p className="text-sm text-gray-400">
                  {searchTerm || typeFilter || statusFilter
                    ? "No integrations match your filters"
                    : "No integrations configured"}
                </p>
                <Button onClick={handleCreate}>
                  <HugeiconsIcon icon={PlugIcon} size={16} className="mr-2" />
                  Create First Integration
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredIntegrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <span className="text-2xl mr-2">
                            {getTypeIcon(integration.type)}
                          </span>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {integration.name}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge className={getTypeColor(integration.type)}>
                            {integration.type}
                          </Badge>
                          <Badge className={getStatusBadge(integration.status)}>
                            {integration.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="text-sm text-gray-600">
                        Type: {integration.type}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(
                            `/integrations/${integration.id}`,
                            "_blank"
                          )
                        }
                      >
                        <HugeiconsIcon
                          icon={DownloadIcon}
                          size={16}
                          className="mr-2"
                        />
                        View
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(
                            `/integrations/${integration.id}/edit`,
                            "_blank"
                          )
                        }
                      >
                        <HugeiconsIcon
                          icon={UploadIcon}
                          size={16}
                          className="mr-2"
                        />
                        Edit
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(
                            `/integrations/${integration.id}/config`,
                            "_blank"
                          )
                        }
                      >
                        <HugeiconsIcon
                          icon={ShieldIcon}
                          size={16}
                          className="mr-2"
                        />
                        Config
                      </Button>

                      {integration.status === "inactive" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivate(integration.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <HugeiconsIcon
                            icon={PlugIcon}
                            size={16}
                            className="mr-2"
                          />
                          Activate
                        </Button>
                      )}

                      {integration.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTest(integration.id)}
                          className="text-yellow-600 hover:text-yellow-700"
                        >
                          <HugeiconsIcon
                            icon={UploadIcon}
                            size={16}
                            className="mr-2"
                          />
                          Deactivate
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTest(integration.id)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <HugeiconsIcon
                          icon={DownloadIcon}
                          size={16}
                          className="mr-2"
                        />
                        Test
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(integration.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <HugeiconsIcon
                          icon={ShieldIcon}
                          size={16}
                          className="mr-2"
                        />
                        Delete
                      </Button>
                    </div>

                    {/* Last Sync */}
                    <div className="text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Last sync:</span>
                        <span>
                          {integration.last_sync_at
                            ? new Date(
                                integration.last_sync_at
                              ).toLocaleString()
                            : "Never synced"}
                        </span>
                      </div>
                    </div>

                    {/* Error Message */}
                    {integration.error_message && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <HugeiconsIcon
                            icon={UploadIcon}
                            size={16}
                            className="text-red-500"
                          />
                          <span className="font-medium text-red-800">
                            Error Message
                          </span>
                        </div>
                        <p className="text-sm text-red-700">
                          {integration.error_message}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
