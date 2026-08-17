/**
 * Approval Node Config Modal
 * Modal for configuring approval nodes
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import apiClient from "~/lib/api/client";
import type {
  ApprovalNodeData,
  ApproverOption,
} from "../types/flow-editor.types";

interface ApprovalNodeConfigModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: ApprovalNodeData) => void;
  initialData?: ApprovalNodeData;
}

export function ApprovalNodeConfigModal({
  open,
  onClose,
  onSave,
  initialData,
}: ApprovalNodeConfigModalProps) {
  const [formData, setFormData] = useState<ApprovalNodeData>({
    type: "approval",
    name: "",
    description: "",
    approverType: "user",
    approvers: [],
    requireAll: false,
    minApprovals: 1,
  });

  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);

  // Fetch users
  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await apiClient.get("/users");
      return response.data.data || response.data || [];
    },
    enabled: open && formData.approverType === "user",
  });

  // Fetch roles
  const { data: rolesData } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const response = await apiClient.get("/roles");
      return response.data.data || response.data || [];
    },
    enabled: open && formData.approverType === "role",
  });

  // Fetch groups
  const { data: groupsData } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const response = await apiClient.get("/groups");
      return response.data.data || response.data || [];
    },
    enabled: open && formData.approverType === "group",
  });

  const users = usersData || [];
  const roles = rolesData || [];
  const groups = groupsData || [];

  const getApproverOptions = (): ApproverOption[] => {
    switch (formData.approverType) {
      case "user":
        return users.map((u: Record<string, unknown>) => ({
          id: u.id,
          name: u.name || u.email,
          type: "user" as const,
          avatar: u.avatar,
        }));
      case "role":
        return roles.map((r: Record<string, unknown>) => ({
          id: r.id,
          name: r.name,
          type: "role" as const,
        }));
      case "group":
        return groups.map((g: Record<string, unknown>) => ({
          id: g.id,
          name: g.name,
          type: "group" as const,
        }));
      default:
        return [];
    }
  };

  const approverOptions = getApproverOptions();

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setSelectedApprovers(initialData.approvers);
    }
  }, [initialData]);

  const handleApproverToggle = (approverId: string) => {
    setSelectedApprovers((prev) => {
      if (prev.includes(approverId)) {
        return prev.filter((id) => id !== approverId);
      }
      return [...prev, approverId];
    });
  };

  const handleSave = () => {
    const dataToSave: ApprovalNodeData = {
      ...formData,
      approvers: selectedApprovers,
    };
    onSave(dataToSave);
    onClose();
  };

  const handleApproverTypeChange = (value: string) => {
    setFormData({
      ...formData,
      approverType: value as "user" | "role" | "group",
    });
    setSelectedApprovers([]); // Reset selected approvers when type changes
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Nodo de Aprobación</DialogTitle>
          <DialogDescription>
            Configura los detalles del nodo de aprobación
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ej: Aprobación Gerente"
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Descripción opcional del paso"
              rows={3}
            />
          </div>

          {/* Approver Type */}
          <div>
            <Label htmlFor="approverType">Tipo de Aprobador</Label>
            <Select
              value={formData.approverType}
              onValueChange={handleApproverTypeChange}
            >
              <SelectTrigger id="approverType">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuario</SelectItem>
                <SelectItem value="role">Rol</SelectItem>
                <SelectItem value="group">Grupo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Approvers Selection */}
          {formData.approverType && (
            <div>
              <Label>
                {formData.approverType === "user"
                  ? "Usuarios"
                  : formData.approverType === "role"
                    ? "Roles"
                    : "Grupos"}
              </Label>
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                {approverOptions.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No hay opciones disponibles
                  </p>
                ) : (
                  approverOptions.map((option) => (
                    <div
                      key={option.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`approver-${option.id}`}
                        checked={selectedApprovers.includes(option.id)}
                        onCheckedChange={() => handleApproverToggle(option.id)}
                      />
                      <label
                        htmlFor={`approver-${option.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {option.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
              {selectedApprovers.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {selectedApprovers.length} seleccionado
                  {selectedApprovers.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}

          {/* Approval Requirements */}
          <div>
            <Label>Requisitos de Aprobación</Label>
            <div className="space-y-2 mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requireAll"
                  checked={formData.requireAll}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      requireAll: checked as boolean,
                    })
                  }
                />
                <label htmlFor="requireAll" className="text-sm cursor-pointer">
                  Requiere todas las aprobaciones
                </label>
              </div>

              {!formData.requireAll && (
                <div>
                  <Label htmlFor="minApprovals">
                    Aprobaciones mínimas requeridas
                  </Label>
                  <Input
                    id="minApprovals"
                    type="number"
                    min="1"
                    max={selectedApprovers.length || 1}
                    value={formData.minApprovals}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minApprovals: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={selectedApprovers.length === 0 || !formData.name}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
