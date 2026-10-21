/**
 * Task Checklist Component
 * Displays and manages checklist items for a task
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { PlugIcon, DownloadIcon, UploadIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslation } from "~/lib/i18n/useTranslation";
import type { ChecklistItem } from "~/features/tasks/types/task.types";

interface TaskChecklistProps {
  items: ChecklistItem[];
  onChange?: (items: ChecklistItem[]) => void;
  readonly?: boolean;
}

export function TaskChecklist({
  items,
  onChange,
  readonly = false,
}: TaskChecklistProps) {
  const { t } = useTranslation();
  const [newItemText, setNewItemText] = useState("");

  const toggleItem = (index: number) => {
    if (readonly) return;

    const updatedItems = [...items];
    const currentItem = updatedItems[index];
    if (currentItem) {
      updatedItems[index] = {
        ...currentItem,
        completed: !currentItem.completed,
        completed_at: !currentItem.completed
          ? new Date().toISOString()
          : undefined,
      };
    }

    onChange?.(updatedItems);
  };

  const updateItemText = (index: number, title: string) => {
    if (readonly) return;

    const updatedItems = [...items];
    const currentItem = updatedItems[index];
    if (currentItem) {
      updatedItems[index] = {
        ...currentItem,
        title,
      };
    }

    onChange?.(updatedItems);
  };

  const removeItem = (index: number) => {
    if (readonly) return;

    const updatedItems = items.filter((_, i) => i !== index);
    onChange?.(updatedItems);
  };

  const addItem = () => {
    if (readonly || !newItemText.trim()) return;

    const newItem: ChecklistItem = {
      id: `new-${Date.now()}`,
      title: newItemText.trim(),
      completed: false,
    };

    onChange?.([...items, newItem]);
    setNewItemText("");
  };

  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;
  const completionPercentage =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("tasks.checklist.title")}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {completedCount}/{totalCount} completed
            </Badge>
            {totalCount > 0 && (
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-2 p-3 border rounded-lg"
            >
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
                  item.completed
                    ? "bg-green-500 border-green-500"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onClick={() => toggleItem(index)}
              >
                {item.completed && (
                  <HugeiconsIcon
                    icon={DownloadIcon}
                    size={12}
                    className="text-white"
                  />
                )}
              </div>

              <div className="flex-1">
                {readonly ? (
                  <span
                    className={`block w-full ${item.completed ? "line-through text-gray-500" : ""}`}
                  >
                    {item.title}
                  </span>
                ) : (
                  <Input
                    value={item.title}
                    onChange={(e) => updateItemText(index, e.target.value)}
                    className="border-0 bg-transparent focus:ring-0"
                    placeholder="Checklist item"
                  />
                )}
              </div>

              {!readonly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeItem(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <HugeiconsIcon
                    icon={UploadIcon}
                    size={16}
                    className="text-red-500 hover:text-red-700"
                  />
                </Button>
              )}
            </div>
          ))}

          {items.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <HugeiconsIcon
                icon={PlugIcon}
                size={48}
                className="mx-auto mb-2 text-gray-300"
              />
              <p>No checklist items yet</p>
            </div>
          )}

          {!readonly && (
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <Input
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                placeholder={t("tasks.checklist.placeholder")}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addItem();
                  }
                }}
                disabled={readonly}
              />
              <Button
                onClick={addItem}
                disabled={readonly || !newItemText.trim()}
              >
                <HugeiconsIcon icon={PlugIcon} size={16} className="mr-2" />
                {t("common.add")}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
