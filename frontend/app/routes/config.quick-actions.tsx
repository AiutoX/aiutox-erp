/**
 * Quick Actions Configuration Page
 * Página para configurar acciones rápidas del usuario
 */

import { useState, useEffect } from "react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import { PageLayout } from "~/components/layout/PageLayout";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
// import { Separator } from "~/components/ui/separator";
import { useQuickActions } from "~/hooks/useQuickActions";
import {
  quickActionsRegistry,
  type QuickAction,
} from "~/lib/quickActions/registry";

export default function QuickActionsConfig() {
  const { t } = useTranslation();
  const allQuickActions = useQuickActions(20); // Obtener todas las acciones posibles

  const [enabledActions, setEnabledActions] = useState<Set<string>>(new Set());
  const [maxVisible, setMaxVisible] = useState(5);
  const [customOrder, setCustomOrder] = useState<string[]>([]);

  // Cargar preferencias del usuario (simulado)
  useEffect(() => {
    // TODO: Cargar desde API/user preferences
    const savedEnabled = new Set([
      "new-task",
      "new-product",
      "upload-file",
      "new-approval",
      "new-user",
    ]);
    const savedMaxVisible = 5;
    const savedOrder = [
      "new-task",
      "new-product",
      "upload-file",
      "new-approval",
      "new-user",
    ];

    setEnabledActions(savedEnabled);
    setMaxVisible(savedMaxVisible);
    setCustomOrder(savedOrder);
  }, []);

  const toggleAction = (actionId: string) => {
    setEnabledActions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(actionId)) {
        newSet.delete(actionId);
      } else {
        newSet.add(actionId);
      }
      return newSet;
    });
  };

  const moveAction = (actionId: string, direction: "up" | "down") => {
    const currentIndex = customOrder.indexOf(actionId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= customOrder.length) return;

    const newOrder = [...customOrder];
    const temp = newOrder[currentIndex]!;
    newOrder[currentIndex] = newOrder[newIndex]!;
    newOrder[newIndex] = temp;
    setCustomOrder(newOrder);
  };

  const savePreferences = () => {
    // TODO: Guardar en API/user preferences
    console.warn("Saving preferences:", {
      enabledActions: Array.from(enabledActions),
      maxVisible,
      customOrder,
    });
    alert("Preferencias guardadas exitosamente");
  };

  const resetToDefaults = () => {
    const defaults = ["new-task", "new-product", "upload-file"];
    setEnabledActions(new Set(defaults));
    setMaxVisible(5);
    setCustomOrder(defaults);
  };

  const getOrderedActions = () => {
    const allActions = quickActionsRegistry.getAll();
    return customOrder
      .map((id) => allActions.find((action) => action.id === id))
      .filter(Boolean) as QuickAction[];
  };

  return (
    <PageLayout title="Configuración de Acciones Rápidas">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Configuración General */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración General</CardTitle>
            <CardDescription>
              Define cómo se comportan las acciones rápidas en el topbar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="max-visible">Máximo de acciones visibles</Label>
                <p className="text-sm text-muted-foreground">
                  Limita el número de acciones mostradas en el menú
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMaxVisible(Math.max(1, maxVisible - 1))}
                >
                  -
                </Button>
                <span className="w-8 text-center">{maxVisible}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMaxVisible(Math.min(10, maxVisible + 1))}
                >
                  +
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acciones Disponibles */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones Disponibles</CardTitle>
            <CardDescription>
              Activa o desactiva acciones rápidas según tus necesidades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allQuickActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <Switch
                      checked={enabledActions.has(action.id)}
                      onCheckedChange={() => toggleAction(action.id)}
                    />
                    <div>
                      <div className="font-medium">
                        {t(action.label as `quickActions.${string}`)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {action.global
                          ? "Global"
                          : `Contextual: ${action.context?.join(", ")}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={action.global ? "default" : "secondary"}>
                      {action.global ? "Global" : "Contextual"}
                    </Badge>
                    <Badge variant="outline">Prioridad {action.priority}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Orden Personalizado */}
        <Card>
          <CardHeader>
            <CardTitle>Orden de Acciones</CardTitle>
            <CardDescription>
              Arrastra o usa los botones para reordenar las acciones activas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getOrderedActions()
                .filter((action) => enabledActions.has(action.id))
                .map((action, index) => (
                  <div
                    key={action.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <span className="font-medium">
                        {t(action.label as `quickActions.${string}`)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveAction(action.id, "up")}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveAction(action.id, "down")}
                        disabled={
                          index ===
                          getOrderedActions().filter((a) =>
                            enabledActions.has(a.id)
                          ).length -
                            1
                        }
                      >
                        ↓
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Acciones */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={resetToDefaults}>
            Restablecer Valores por Defecto
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={() => window.history.back()}>
              Cancelar
            </Button>
            <Button onClick={savePreferences}>Guardar Preferencias</Button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
