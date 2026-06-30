/**
 * PermissionDelegationModal Component
 *
 * Modal for delegating permissions temporarily to a user
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { useUsers } from "../hooks/useUsers";
import {
  usePermissionsByModule,
  useDelegatePermission,
} from "../hooks/useUserPermissions";
import { showToast } from "~/components/common/Toast";
import type { PermissionDelegation } from "../types/user.types";

const delegationSchema = z.object({
  target_user_id: z.string().uuid("Usuario inválido"),
  permission: z.string().min(1, "Debe seleccionar un permiso"),
  expires_at: z.string().optional().nullable(),
});

type DelegationFormData = z.infer<typeof delegationSchema>;

interface PermissionDelegationModalProps {
  open: boolean;
  onClose: () => void;
  moduleId?: string;
  currentUserId: string;
  onSuccess?: () => void;
}

/**
 * PermissionDelegationModal component
 */
export function PermissionDelegationModal({
  open,
  onClose,
  moduleId,
  currentUserId,
  onSuccess,
}: PermissionDelegationModalProps) {
  const { users } = useUsers();
  const { permissionGroups } = usePermissionsByModule();
  const { delegate, loading } = useDelegatePermission();

  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set()
  );

  // Filter users (exclude current user)
  const availableUsers = users.filter((u) => u.id !== currentUserId);

  // Filter permission groups by module if specified
  const filteredGroups = moduleId
    ? permissionGroups.filter((g) => g.module_id === moduleId)
    : permissionGroups;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<DelegationFormData>({
    resolver: zodResolver(delegationSchema),
    defaultValues: {
      target_user_id: "",
      permission: "",
      expires_at: null,
    },
  });

  const selectedUserId = watch("target_user_id");

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      reset();
      setSelectedPermissions(new Set());
    }
  }, [open, reset]);

  const handlePermissionToggle = (permission: string) => {
    setSelectedPermissions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(permission)) {
        newSet.delete(permission);
      } else {
        // Only allow one permission at a time for delegation
        newSet.clear();
        newSet.add(permission);
      }
      return newSet;
    });
  };

  const onSubmit = async (data: DelegationFormData) => {
    if (selectedPermissions.size === 0) {
      return;
    }

    const permission = Array.from(selectedPermissions)[0];
    if (!permission) {
      showToast("Debe seleccionar un permiso", "error");
      return;
    }

    const module = permission.split(".")[0];
    if (!module) {
      showToast("Permiso inválido", "error");
      return;
    }

    const delegation: PermissionDelegation = {
      target_user_id: data.target_user_id,
      permission: permission,
      expires_at: data.expires_at || null,
    };

    const result = await delegate(module, delegation);
    if (result) {
      showToast("Permiso delegado exitosamente", "success");
      onSuccess?.();
      onClose();
    } else {
      showToast("Error al delegar el permiso", "error");
    }
  };

  // Update form when selectedPermissions changes
  useEffect(() => {
    if (selectedPermissions.size > 0) {
      const firstPermission = Array.from(selectedPermissions)[0];
      if (firstPermission) {
        setValue("permission", firstPermission);
      }
    }
  }, [selectedPermissions, setValue]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Delegar Permiso</DialogTitle>
          <DialogDescription>
            Asigna un permiso temporalmente a otro usuario
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Select Target User */}
          <div className="space-y-2">
            <Label htmlFor="target_user_id">
              Usuario Destino <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedUserId}
              onValueChange={(value) => setValue("target_user_id", value)}
              disabled={loading || isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar usuario" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.target_user_id && (
              <p className="text-sm text-destructive">
                {errors.target_user_id.message}
              </p>
            )}
          </div>

          {/* Select Permission */}
          <div className="space-y-2">
            <Label>
              Permiso <span className="text-destructive">*</span>
            </Label>
            <div className="space-y-4 max-h-[300px] overflow-y-auto">
              {filteredGroups.map((group) => (
                <div key={group.module_id} className="rounded-md border p-4">
                  <h4 className="font-medium mb-3">{group.module_name}</h4>
                  <div className="space-y-2">
                    {group.permissions.map((perm) => (
                      <div
                        key={perm.permission}
                        className="flex items-center gap-2"
                      >
                        <Checkbox
                          id={perm.permission}
                          checked={selectedPermissions.has(perm.permission)}
                          onCheckedChange={() =>
                            handlePermissionToggle(perm.permission)
                          }
                          disabled={loading || isSubmitting}
                        />
                        <Label
                          htmlFor={perm.permission}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {perm.permission}
                          {perm.description && (
                            <span className="text-muted-foreground ml-2">
                              - {perm.description}
                            </span>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {errors.permission && (
              <p className="text-sm text-destructive">
                {errors.permission.message}
              </p>
            )}
          </div>

          {/* Expiration Date */}
          <div className="space-y-2">
            <Label htmlFor="expires_at">Fecha de Expiración (Opcional)</Label>
            <Input
              id="expires_at"
              type="datetime-local"
              {...register("expires_at")}
              disabled={loading || isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Si no se especifica, el permiso no expirará automáticamente
            </p>
          </div>

          {/* Selected Permission Summary */}
          {selectedPermissions.size > 0 && (
            <div className="rounded-md border bg-muted/50 p-4">
              <p className="text-sm font-medium mb-2">Permiso Seleccionado:</p>
              <p className="text-sm">{Array.from(selectedPermissions)[0]}</p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading || isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                loading || isSubmitting || selectedPermissions.size === 0
              }
            >
              {loading || isSubmitting ? "Delegando..." : "Delegar Permiso"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
