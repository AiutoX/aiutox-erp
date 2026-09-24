/**
 * Approval Request Form Component
 * Form for creating and editing approval requests
 */

import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import apiClient from "~/lib/api/client";
import type {
  ApprovalRequestResponse,
  ApprovalRequestCreate,
} from "../types/approval.types";

interface ApprovalRequestFormProps {
  request?: ApprovalRequestResponse | null;
  onSubmit: (data: ApprovalRequestCreate) => void;
  onCancel: () => void;
  loading?: boolean;
}

// Entity types available in the system
const ENTITY_TYPES = [
  { value: "product", label: "Producto" },
  { value: "order", label: "Pedido" },
  { value: "invoice", label: "Factura" },
  { value: "contact", label: "Contacto" },
  { value: "organization", label: "Organización" },
  { value: "task", label: "Tarea" },
  { value: "activity", label: "Actividad" },
] as const;

export function ApprovalRequestForm({
  request,
  onSubmit,
  onCancel,
  loading = false,
}: ApprovalRequestFormProps) {
  const [formData, setFormData] = useState({
    flow_id: request?.flow_id || "",
    title: request?.title || "",
    description: request?.description || "",
    entity_type: request?.entity_type || "",
    entity_id: request?.entity_id || "",
  });

  const [selectedEntityType, setSelectedEntityType] = useState<string>(
    request?.entity_type || ""
  );

  // Fetch entities based on selected type
  const { data: entitiesData, isLoading: loadingEntities } = useQuery({
    queryKey: ["entities", selectedEntityType],
    queryFn: async () => {
      if (!selectedEntityType) return [];
      const response = await apiClient.get(`/${selectedEntityType}s`);
      return response.data.data || response.data || [];
    },
    enabled: !!selectedEntityType,
  });

  const entities = entitiesData || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleEntityTypeChange = (value: string) => {
    setSelectedEntityType(value);
    setFormData({
      ...formData,
      entity_type: value,
      entity_id: "", // Reset entity_id when entity type changes
    });
  };

  const handleEntityChange = (value: string) => {
    setFormData({
      ...formData,
      entity_id: value,
    });
  };

  return (
    <Card data-testid="approval-request-form">
      <CardHeader>
        <CardTitle>
          {request ? "Editar Solicitud" : "Crear Solicitud"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="flow_id">ID del Flujo</Label>
            <Input
              id="flow_id"
              name="flow_id"
              value={formData.flow_id}
              onChange={handleChange}
              required
              data-testid="approval-flow-id-input"
            />
          </div>

          <div>
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              data-testid="approval-title-input"
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              required
              data-testid="approval-description-input"
            />
          </div>

          <div>
            <Label htmlFor="entity_type">Tipo de Entidad</Label>
            <Select
              value={selectedEntityType}
              onValueChange={handleEntityTypeChange}
              required
            >
              <SelectTrigger
                id="entity_type"
                data-testid="approval-entity-type-select"
              >
                <SelectValue placeholder="Seleccionar tipo de entidad" />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEntityType && (
            <div>
              <Label htmlFor="entity_id">Entidad</Label>
              <Select
                value={formData.entity_id}
                onValueChange={handleEntityChange}
                required
                disabled={loadingEntities}
              >
                <SelectTrigger
                  id="entity_id"
                  data-testid="approval-entity-select"
                >
                  <SelectValue
                    placeholder={
                      loadingEntities
                        ? "Cargando entidades..."
                        : "Seleccionar entidad"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {entities.length === 0 ? (
                    <SelectItem value="" disabled>
                      No hay entidades disponibles
                    </SelectItem>
                  ) : (
                    entities.map(
                      (entity: {
                        id: string;
                        name?: string;
                        title?: string;
                      }) => (
                        <SelectItem key={entity.id} value={entity.id}>
                          {entity.name || entity.title || entity.id}
                        </SelectItem>
                      )
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || loadingEntities}
              data-testid="approval-submit-button"
            >
              {loading ? "Guardando..." : request ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
