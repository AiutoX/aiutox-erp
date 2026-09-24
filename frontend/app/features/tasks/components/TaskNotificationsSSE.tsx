/**
 * TaskNotificationsSSE component
 * Real-time notifications using Server-Sent Events (SSE)
 */

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Notification01Icon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { useSSE } from "~/hooks/useSSE";
import { showToast } from "~/components/common/Toast";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface TaskNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  task_id?: string;
  timestamp: string;
  read: boolean;
  severity: "info" | "success" | "warning" | "error";
}

export function TaskNotificationsSSE() {
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const { isConnected } = useSSE({
    url: "/api/v1/sse/stream",
    enabled: true,
    onEvent: (event) => {
      if (event.type.startsWith("task.")) {
        handleTaskEvent(event);
      }
    },
  });

  const handleTaskEvent = (event: {
    type: string;
    data: Record<string, unknown>;
  }) => {
    const notification: TaskNotification = {
      id: `${Date.now()}-${Math.random()}`,
      type: event.type,
      title: getEventTitle(event.type),
      message: getEventMessage(event),
      task_id: (event.data?.task_id ?? event.data?.id) as string | undefined,
      timestamp: new Date().toISOString(),
      read: false,
      severity: getEventSeverity(event.type),
    };

    setNotifications((prev) => [notification, ...prev.slice(0, 49)]);
    setUnreadCount((prev) => prev + 1);

    showToast(notification.message, notification.severity);
  };

  const getEventTitle = (eventType: string): string => {
    const titles: Record<string, string> = {
      "task.created": "Tarea Creada",
      "task.updated": "Tarea Actualizada",
      "task.assigned": "Tarea Asignada",
      "task.unassigned": "Tarea Desasignada",
      "task.status_changed": "Estado Cambiado",
      "task.completed": "Tarea Completada",
      "task.cancelled": "Tarea Cancelada",
      "task.comment_added": "Nuevo Comentario",
      "task.file_attached": "Archivo Adjunto",
      "task.due_soon": "Próxima a Vencer",
      "task.overdue": "Tarea Vencida",
    };
    return titles[eventType] || "Notificación";
  };

  const getEventMessage = (event: {
    type: string;
    data: Record<string, unknown>;
  }): string => {
    const taskTitle = event.data?.title || "Tarea";

    switch (event.type) {
      case "task.created":
        return `Nueva tarea: ${taskTitle}`;
      case "task.updated":
        return `Tarea actualizada: ${taskTitle}`;
      case "task.assigned":
        return `Te asignaron: ${taskTitle}`;
      case "task.unassigned":
        return `Desasignado de: ${taskTitle}`;
      case "task.status_changed":
        return `Estado cambiado: ${taskTitle}`;
      case "task.completed":
        return `Completada: ${taskTitle}`;
      case "task.cancelled":
        return `Cancelada: ${taskTitle}`;
      case "task.comment_added":
        return `Nuevo comentario en: ${taskTitle}`;
      case "task.file_attached":
        return `Archivo adjunto en: ${taskTitle}`;
      case "task.due_soon":
        return `Próxima a vencer: ${taskTitle}`;
      case "task.overdue":
        return `Vencida: ${taskTitle}`;
      default:
        return `Notificación: ${taskTitle}`;
    }
  };

  const getEventSeverity = (
    eventType: string
  ): "info" | "success" | "warning" | "error" => {
    if (eventType === "task.completed") return "success";
    if (eventType === "task.overdue" || eventType === "task.cancelled")
      return "error";
    if (eventType === "task.due_soon") return "warning";
    return "info";
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const getIcon = (severity: string) => {
    switch (severity) {
      case "success":
        return CheckmarkCircle01Icon;
      case "error":
        return AlertCircleIcon;
      case "warning":
        return AlertCircleIcon;
      default:
        return InformationCircleIcon;
    }
  };

  const getIconColor = (severity: string) => {
    switch (severity) {
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
      case "warning":
        return "text-yellow-600";
      default:
        return "text-blue-600";
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <HugeiconsIcon icon={Notification01Icon} size={20} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
          {isConnected && (
            <span className="absolute bottom-0 right-0 h-2 w-2 bg-green-500 rounded-full border border-background" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Notificaciones</CardTitle>
                <CardDescription>
                  {unreadCount > 0 ? `${unreadCount} sin leer` : "Todo leído"}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                    Marcar todas
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAll}>
                    Limpiar
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <HugeiconsIcon
                  icon={Notification01Icon}
                  size={48}
                  className="mx-auto mb-2 opacity-50"
                />
                <p>No hay notificaciones</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-1 p-2">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        notification.read
                          ? "bg-background hover:bg-muted/50"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <HugeiconsIcon
                          icon={getIcon(notification.severity)}
                          size={20}
                          className={getIconColor(notification.severity)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium truncate">
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <span className="h-2 w-2 bg-blue-600 rounded-full shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(
                              new Date(notification.timestamp),
                              {
                                addSuffix: true,
                                locale: es,
                              }
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
