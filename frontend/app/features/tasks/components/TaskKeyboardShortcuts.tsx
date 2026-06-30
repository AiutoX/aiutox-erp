/**
 * TaskKeyboardShortcuts component
 * Keyboard shortcuts for task management
 */

import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";

interface ShortcutItem {
  keys: string[];
  description: string;
  action: () => void;
}

interface TaskKeyboardShortcutsProps {
  onCreateTask?: () => void;
  onSearch?: () => void;
  onRefresh?: () => void;
  showHelp?: boolean;
  onHelpClose?: () => void;
}

export function TaskKeyboardShortcuts({
  onCreateTask,
  onSearch,
  onRefresh,
  showHelp = false,
  onHelpClose,
}: TaskKeyboardShortcutsProps) {
  const navigate = useNavigate();

  const shortcuts = useMemo<ShortcutItem[]>(
    () => [
      {
        keys: ["c"],
        description: "Crear nueva tarea",
        action: () => onCreateTask?.() || void navigate("/tasks-create"),
      },
      {
        keys: ["/", "s"],
        description: "Buscar tareas",
        action: () => onSearch?.(),
      },
      {
        keys: ["r"],
        description: "Refrescar lista",
        action: () => onRefresh?.(),
      },
      {
        keys: ["g", "t"],
        description: "Ir a Tareas",
        action: () => void navigate("/tasks"),
      },
      {
        keys: ["g", "c"],
        description: "Ir a Calendario",
        action: () => void navigate("/tasks?tab=calendar"),
      },
      {
        keys: ["g", "b"],
        description: "Ir a Board",
        action: () => void navigate("/tasks?tab=board"),
      },
      {
        keys: ["g", "i"],
        description: "Ir a Inbox",
        action: () => void navigate("/tasks?tab=inbox"),
      },
      {
        keys: ["?"],
        description: "Mostrar ayuda",
        action: () => onHelpClose?.(),
      },
    ],
    [navigate, onCreateTask, onSearch, onRefresh, onHelpClose]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Check for shortcuts
      const key = e.key.toLowerCase();

      // Single key shortcuts
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const shortcut = shortcuts.find(
          (s) => s.keys.length === 1 && s.keys[0] === key
        );
        if (shortcut) {
          e.preventDefault();
          shortcut.action();
        }
      }

      // Ctrl/Cmd + key shortcuts
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
        if (key === "k") {
          e.preventDefault();
          onSearch?.();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, onSearch]);

  return (
    <Dialog open={showHelp} onOpenChange={onHelpClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Atajos de Teclado</DialogTitle>
          <DialogDescription>
            Usa estos atajos para navegar y gestionar tareas más rápido
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <span className="text-sm">{shortcut.description}</span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, i) => (
                  <Badge key={i} variant="secondary" className="font-mono">
                    {key.toUpperCase()}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <span className="text-sm">Buscar (alternativo)</span>
            <div className="flex gap-1">
              <Badge variant="secondary" className="font-mono">
                CTRL
              </Badge>
              <Badge variant="secondary" className="font-mono">
                K
              </Badge>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
