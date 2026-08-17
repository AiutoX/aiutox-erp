/**
 * Tenants Configuration Page
 *
 * CRUD de tenants del sistema. Solo accesible para el rol owner.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { usePermissions } from "~/hooks/usePermissions";
import { showToast } from "~/components/common/Toast";
import { ConfigPageLayout } from "~/components/config/ConfigPageLayout";
import { ConfigLoadingState } from "~/components/config/ConfigLoadingState";
import { ConfigErrorState } from "~/components/config/ConfigErrorState";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Switch } from "~/components/ui/switch";
import { useAuthStore } from "~/stores/authStore";
import {
  listTenants,
  createTenant,
  updateTenant,
  deleteTenant,
  type Tenant,
  type TenantCreate,
  type TenantUpdate,
} from "~/features/config/api/tenants.api";

export function meta() {
  return [
    { title: "Tenants - AiutoX ERP" },
    { name: "description", content: "Gestión de tenants del sistema" },
  ];
}

interface TenantFormState {
  name: string;
  slug: string;
}

const EMPTY_FORM: TenantFormState = { name: "", slug: "" };

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function TenantsConfigPage() {
  useTranslation();
  const queryClient = useQueryClient();
  const { permissions } = usePermissions();
  const { user, updateUser } = useAuthStore();
  const isOwner = permissions.includes("*");

  const [createOpen, setCreateOpen] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [form, setForm] = useState<TenantFormState>(EMPTY_FORM);
  const [editName, setEditName] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["tenants", page],
    queryFn: () => listTenants({ page, page_size: 20 }),
    enabled: isOwner,
  });

  const createMutation = useMutation({
    mutationFn: (payload: TenantCreate) => createTenant(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      showToast("Tenant creado correctamente", "success");
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Error al crear tenant";
      showToast(msg, "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TenantUpdate }) =>
      updateTenant(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      showToast("Tenant actualizado", "success");
      setEditTenant(null);
      // Sync navbar if the updated tenant is the current user's tenant
      if (user?.tenant_id === updated.id) {
        updateUser({ tenant_name: updated.name });
      }
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Error al actualizar";
      showToast(msg, "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      showToast("Tenant eliminado", "success");
      setDeleteTarget(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Error al eliminar";
      showToast(msg, "error");
    },
  });

  if (!isOwner) {
    return (
      <ConfigPageLayout
        title="Tenants"
        description="Gestión de tenants del sistema"
      >
        <ConfigErrorState message="Solo el rol owner puede gestionar tenants." />
      </ConfigPageLayout>
    );
  }

  if (isLoading) {
    return (
      <ConfigPageLayout
        title="Tenants"
        description="Gestión de tenants del sistema"
        loading
      >
        <ConfigLoadingState lines={5} />
      </ConfigPageLayout>
    );
  }

  if (error) {
    return (
      <ConfigPageLayout
        title="Tenants"
        description="Gestión de tenants del sistema"
      >
        <ConfigErrorState message="Error al cargar los tenants." />
      </ConfigPageLayout>
    );
  }

  const tenants = data?.data ?? [];
  const meta = data?.meta;

  const openEdit = (tenant: Tenant) => {
    setEditTenant(tenant);
    setEditName(tenant.name);
    setEditActive(tenant.is_active);
  };

  const handleCreate = () => {
    if (!form.name.trim() || !form.slug.trim()) return;
    createMutation.mutate({ name: form.name.trim(), slug: form.slug.trim() });
  };

  const handleUpdate = () => {
    if (!editTenant) return;
    updateMutation.mutate({
      id: editTenant.id,
      data: { name: editName.trim() || undefined, is_active: editActive },
    });
  };

  return (
    <ConfigPageLayout
      title="Tenants"
      description="Gestión de tenants del sistema"
    >
      {/* Header actions */}
      <div className="flex justify-end mb-4">
        <Button
          onClick={() => {
            setForm(EMPTY_FORM);
            setCreateOpen(true);
          }}
        >
          Nuevo tenant
        </Button>
      </div>

      {/* Tenant list */}
      {tenants.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay tenants registrados.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tenants.map((tenant) => (
            <Card key={tenant.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">{tenant.name}</CardTitle>
                    <Badge variant="outline" className="font-mono text-xs">
                      {tenant.slug}
                    </Badge>
                    <Badge variant={tenant.is_active ? "default" : "secondary"}>
                      {tenant.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(tenant)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(tenant)}
                      disabled={tenant.user_count > 0}
                      title={
                        tenant.user_count > 0
                          ? `Tiene ${tenant.user_count} usuario(s)`
                          : "Eliminar"
                      }
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription>
                  {tenant.user_count} usuario
                  {tenant.user_count !== 1 ? "s" : ""} · Creado{" "}
                  {new Date(tenant.created_at).toLocaleDateString()}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.total_pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm py-2 px-1 text-muted-foreground">
            {page} / {meta.total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.total_pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo tenant</DialogTitle>
            <DialogDescription>
              El slug debe ser único y no puede modificarse después de creado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="create-name">Nombre</Label>
              <Input
                id="create-name"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((prev) => ({
                    name,
                    slug: prev.slug || slugify(name),
                  }));
                }}
                placeholder="Mi empresa"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-slug">Slug</Label>
              <Input
                id="create-slug"
                value={form.slug}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    slug: slugify(e.target.value),
                  }))
                }
                placeholder="mi-empresa"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Solo letras minúsculas, números y guiones.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !form.name.trim() ||
                !form.slug.trim() ||
                createMutation.isPending
              }
            >
              {createMutation.isPending ? "Creando..." : "Crear tenant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={!!editTenant}
        onOpenChange={(open) => !open && setEditTenant(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar tenant</DialogTitle>
            <DialogDescription>
              El slug <span className="font-mono">{editTenant?.slug}</span> no
              puede modificarse.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="edit-active"
                checked={editActive}
                onCheckedChange={setEditActive}
              />
              <Label htmlFor="edit-active">Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTenant(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!editName.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tenant?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el tenant{" "}
              <strong>{deleteTarget?.name}</strong> permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget.id)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfigPageLayout>
  );
}
