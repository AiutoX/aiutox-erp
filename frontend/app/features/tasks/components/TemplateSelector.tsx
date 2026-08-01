/**
 * TemplateSelector component
 * Displays available task templates for quick task creation
 */

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton } from "~/components/ui/skeleton";
import { useTaskTemplates } from "../hooks/useTaskTemplates";
import type { TaskTemplate } from "../types/task.types";

interface TemplateSelectorProps {
  onSelect: (template: TaskTemplate) => void;
  onCancel?: () => void;
}

export function TemplateSelector({
  onSelect,
  onCancel,
}: TemplateSelectorProps) {
  const { data: templates, isLoading, error } = useTaskTemplates();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">Error al cargar templates</p>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">
          No hay templates disponibles
        </p>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Selecciona un Template</h3>
          <p className="text-sm text-muted-foreground">
            Crea una tarea rápidamente usando un template predefinido
          </p>
        </div>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>

      <ScrollArea className="h-[500px] pr-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template: TaskTemplate) => (
            <Card
              key={template.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onSelect(template)}
            >
              <CardHeader>
                <CardTitle className="text-base">{template.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Category and estimated time */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {template.category && (
                      <Badge variant="outline">{template.category}</Badge>
                    )}
                    {template.estimated_hours && (
                      <span className="text-xs text-muted-foreground">
                        ~{template.estimated_hours}h
                      </span>
                    )}
                  </div>

                  {/* Checklist preview */}
                  {template.checklist_items &&
                    template.checklist_items.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">
                          {template.checklist_items.length} pasos
                        </span>
                      </div>
                    )}

                  {/* Usage count */}
                  {template.usage_count !== undefined &&
                    template.usage_count > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Usado {template.usage_count}{" "}
                        {template.usage_count === 1 ? "vez" : "veces"}
                      </div>
                    )}

                  <Button
                    size="sm"
                    className="w-full mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(template);
                    }}
                  >
                    Usar Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
