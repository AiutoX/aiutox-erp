/**
 * TemplateQuickAdd component
 * Quick task creation using templates
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { TemplateSelector } from "./TemplateSelector";
import { TaskForm } from "./TaskForm";
import { useCreateTaskFromTemplate } from "../hooks/useTaskTemplates";
import type { TaskTemplate, TaskCreate } from "../types/task.types";

interface TemplateQuickAddProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TemplateQuickAdd({
  open,
  onOpenChange,
  onSuccess,
}: TemplateQuickAddProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(
    null
  );
  const [showForm, setShowForm] = useState(false);
  const createFromTemplate = useCreateTaskFromTemplate();

  const handleTemplateSelect = (template: TaskTemplate) => {
    setSelectedTemplate(template);
    setShowForm(true);
  };

  const handleBack = () => {
    setShowForm(false);
    setSelectedTemplate(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedTemplate(null);
    onOpenChange(false);
  };

  const handleFormSubmit = async (taskData: Partial<TaskCreate>) => {
    if (!selectedTemplate) return;

    try {
      await createFromTemplate.mutateAsync({
        templateId: selectedTemplate.id,
        taskData: {
          title: taskData.title || "",
          description: taskData.description || "",
          assigned_to_id: taskData.assigned_to_id || "",
          due_date: taskData.due_date || "",
          start_at: taskData.start_at || undefined,
          end_at: taskData.end_at || undefined,
        },
      });

      // Success
      setShowForm(false);
      setSelectedTemplate(null);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating task from template:", error);
      // Error handling is done by the form
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {showForm && selectedTemplate
              ? `Crear Tarea: ${selectedTemplate.name}`
              : "Crear Tarea desde Template"}
          </DialogTitle>
        </DialogHeader>

        {!showForm ? (
          <TemplateSelector
            onSelect={handleTemplateSelect}
            onCancel={handleCancel}
          />
        ) : selectedTemplate ? (
          <div className="space-y-4">
            {/* Template info */}
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">{selectedTemplate.name}</h4>
              <p className="text-sm text-muted-foreground mb-2">
                {selectedTemplate.description}
              </p>
              {selectedTemplate.estimated_hours && (
                <p className="text-xs text-muted-foreground">
                  Tiempo estimado: {selectedTemplate.estimated_hours}h
                </p>
              )}
            </div>

            {/* Task form with template defaults */}
            <TaskForm
              initialData={{
                title: selectedTemplate.name,
                description: selectedTemplate.description,
                checklist: selectedTemplate.checklist_items || [],
              }}
              onSubmit={handleFormSubmit}
              onCancel={handleBack}
              submitLabel="Crear Tarea"
              isSubmitting={createFromTemplate.isPending}
            />

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                Volver a Templates
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
