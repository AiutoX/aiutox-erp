/**
 * Concentrator Node Config Modal
 * Modal for configuring concentrator nodes
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
import { Checkbox } from "~/components/ui/checkbox";
import type { ConcentratorNodeData } from "../types/flow-editor.types";

interface ConcentratorNodeConfigModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: ConcentratorNodeData) => void;
  initialData?: ConcentratorNodeData;
  inputCount: number; // Number of parallel inputs
}

export function ConcentratorNodeConfigModal({
  open,
  onClose,
  onSave,
  initialData,
  inputCount,
}: ConcentratorNodeConfigModalProps) {
  const [formData, setFormData] = useState<ConcentratorNodeData>({
    type: "concentrator",
    name: "",
    requireAll: false,
    minApprovals: 1,
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar Nodo Concentrador</DialogTitle>
          <DialogDescription>
            Configura los requisitos de aprobación para este nodo concentrador
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
              placeholder="Ej: Concentrador Paralelo"
              required
            />
          </div>

          {/* Input Count Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              Este nodo tiene {inputCount} entrada{inputCount !== 1 ? "s" : ""}{" "}
              de aprobación
              {inputCount !== 1 ? "es" : ""} paralela
              {inputCount !== 1 ? "s" : ""}
            </p>
          </div>

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
                  Requiere todas las aprobaciones ({inputCount})
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
                    max={inputCount}
                    value={formData.minApprovals}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minApprovals: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Mínimo: 1, Máximo: {inputCount}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-700 mb-2">Resumen:</p>
            <p className="text-sm text-gray-600">
              {formData.requireAll
                ? `Se requieren todas las ${inputCount} aprobaciones`
                : `Se requieren al menos ${formData.minApprovals} de ${inputCount} aprobaciones`}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!formData.name}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
