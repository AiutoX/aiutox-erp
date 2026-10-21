/**
 * WebhookSettings component
 * Configuration UI for task webhooks
 */

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Switch } from "~/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Delete01Icon,
  Edit01Icon,
  LinkSquare02Icon,
  CheckmarkCircle01Icon,
} from "@hugeicons/core-free-icons";
import {
  useWebhooks,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useTestWebhook,
  useToggleWebhook,
} from "../hooks/useWebhooks";
import { useWebhookEventsByModule } from "../hooks/useWebhookEvents";
import type { WebhookCreate, WebhookUpdate } from "../types/webhook.types";
import { showToast } from "~/components/common/Toast";

export function WebhookSettings() {
  const { data: webhooksResponse, isLoading } = useWebhooks();
  const {
    data: eventsByModule,
    modules,
    isLoading: eventsLoading,
  } = useWebhookEventsByModule();
  const createWebhook = useCreateWebhook();
  const updateWebhook = useUpdateWebhook();
  const deleteWebhook = useDeleteWebhook();
  const testWebhook = useTestWebhook();
  const toggleWebhook = useToggleWebhook();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<string | null>(null);
  const [formData, setFormData] = useState<WebhookCreate>({
    name: "",
    url: "",
    event_type: "",
  });

  const webhooks = webhooksResponse?.data || [];

  const handleCreate = async () => {
    if (!formData.name || !formData.url || !formData.event_type) {
      showToast("Por favor completa todos los campos", "error");
      return;
    }

    try {
      await createWebhook.mutateAsync(formData);
      showToast("Webhook creado exitosamente", "success");
      setIsDialogOpen(false);
      resetForm();
    } catch {
      showToast("Error al crear webhook", "error");
    }
  };

  const handleUpdate = async () => {
    if (!editingWebhook) return;

    try {
      const updateData: WebhookUpdate = {
        name: formData.name,
        url: formData.url,
        event_type: formData.event_type,
      };

      await updateWebhook.mutateAsync({ id: editingWebhook, data: updateData });
      showToast("Webhook actualizado exitosamente", "success");
      setIsDialogOpen(false);
      setEditingWebhook(null);
      resetForm();
    } catch {
      showToast("Error al actualizar webhook", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este webhook?")) return;

    try {
      await deleteWebhook.mutateAsync(id);
      showToast("Webhook eliminado exitosamente", "success");
    } catch {
      showToast("Error al eliminar webhook", "error");
    }
  };

  const handleTest = async (id: string) => {
    try {
      const result = await testWebhook.mutateAsync(id);
      if (result.data.success) {
        showToast("Webhook probado exitosamente", "success");
      } else {
        showToast(`Error en prueba: ${result.data.message}`, "error");
      }
    } catch {
      showToast("Error al probar webhook", "error");
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await toggleWebhook.mutateAsync({ id, enabled });
      showToast(`Webhook ${enabled ? "activado" : "desactivado"}`, "success");
    } catch {
      showToast("Error al cambiar estado del webhook", "error");
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setEditingWebhook(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (webhook: {
    id: string;
    name: string;
    url: string;
    event_type: string;
  }) => {
    setFormData({
      name: webhook.name,
      url: webhook.url,
      event_type: webhook.event_type,
    });
    setEditingWebhook(webhook.id);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      url: "",
      event_type: "",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Webhooks de Tareas</h2>
          <p className="text-muted-foreground">
            Configura webhooks para recibir notificaciones de eventos de tareas
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
              Nuevo Webhook
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingWebhook ? "Editar Webhook" : "Crear Webhook"}
              </DialogTitle>
              <DialogDescription>
                Configura un webhook para recibir notificaciones de eventos de
                tareas
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Mi Webhook"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  placeholder="https://api.ejemplo.com/webhooks/tasks"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event_type">Tipo de Evento</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, event_type: value })
                  }
                >
                  <SelectTrigger id="event_type">
                    <SelectValue placeholder="Selecciona un evento" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventsLoading ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        Cargando eventos...
                      </div>
                    ) : (
                      Object.entries(eventsByModule || {}).map(
                        ([moduleKey, events]) => (
                          <div key={moduleKey}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              {modules?.[moduleKey]?.name || moduleKey}
                            </div>
                            {events.map((event) => (
                              <SelectItem key={event.value} value={event.value}>
                                {event.label}
                              </SelectItem>
                            ))}
                          </div>
                        )
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  editingWebhook ? void handleUpdate() : void handleCreate()
                }
                disabled={createWebhook.isPending || updateWebhook.isPending}
              >
                {editingWebhook ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-muted-foreground">
              Cargando webhooks...
            </div>
          </CardContent>
        </Card>
      ) : webhooks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <HugeiconsIcon
              icon={LinkSquare02Icon}
              size={48}
              className="mx-auto mb-4 text-muted-foreground"
            />
            <h3 className="text-lg font-semibold mb-2">
              No hay webhooks configurados
            </h3>
            <p className="text-muted-foreground mb-4">
              Crea tu primer webhook para recibir notificaciones de eventos de
              tareas
            </p>
            <Button onClick={openCreateDialog}>
              <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
              Crear Primer Webhook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Webhooks Configurados</CardTitle>
            <CardDescription>
              {webhooks.length} webhook{webhooks.length !== 1 ? "s" : ""}{" "}
              configurado{webhooks.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Estadísticas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((webhook) => {
                  const eventLabel =
                    Object.values(eventsByModule || {})
                      .flat()
                      .find((e) => e.value === webhook.event_type)?.label ||
                    webhook.event_type;

                  return (
                    <TableRow key={webhook.id}>
                      <TableCell className="font-medium">
                        {webhook.name}
                      </TableCell>
                      <TableCell
                        className="max-w-xs truncate"
                        title={webhook.url}
                      >
                        {webhook.url}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{eventLabel}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={webhook.enabled}
                            onCheckedChange={(checked) =>
                              void handleToggle(webhook.id, checked)
                            }
                          />
                          <Badge
                            variant={webhook.enabled ? "default" : "secondary"}
                          >
                            {webhook.enabled ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <HugeiconsIcon
                            icon={CheckmarkCircle01Icon}
                            size={14}
                            className="text-green-600"
                          />
                          <span className="text-xs text-muted-foreground">
                            {webhook.status === "active"
                              ? "Funcionando"
                              : "Error"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleTest(webhook.id)}
                            disabled={testWebhook.isPending}
                          >
                            Probar
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(webhook)}
                          >
                            <HugeiconsIcon icon={Edit01Icon} size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => void handleDelete(webhook.id)}
                            disabled={deleteWebhook.isPending}
                          >
                            <HugeiconsIcon icon={Delete01Icon} size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Eventos Disponibles</CardTitle>
          <CardDescription>
            Tipos de eventos que puedes configurar para tus webhooks desde todos
            los módulos activos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="text-center text-muted-foreground py-8">
              Cargando eventos...
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(eventsByModule || {}).map(
                ([moduleKey, events]) => (
                  <div key={moduleKey}>
                    <h4 className="text-sm font-semibold mb-3 text-muted-foreground">
                      {modules?.[moduleKey]?.name || moduleKey}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {events.map((event) => (
                        <div
                          key={event.value}
                          className="flex items-center gap-2 p-3 border rounded-lg"
                        >
                          <Badge
                            variant="outline"
                            className="font-mono text-xs"
                          >
                            {event.value}
                          </Badge>
                          <span className="text-sm">{event.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
