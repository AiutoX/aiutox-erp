/**
 * Toast Component
 *
 * Simple toast notification component
 * Note: In production, consider using a toast library like sonner or react-hot-toast
 */

import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info, XCircle } from "lucide-react";
import { cn } from "~/lib/utils";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

/**
 * Toast component
 */
export function Toast({
  message,
  type = "info",
  duration = 5000,
  onClose,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300); // Wait for animation
      }, duration);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [duration, onClose]);

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  };

  const styles = {
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };

  const Icon = icons[type];

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-md border p-4 shadow-lg transition-all",
        styles[type],
        isVisible ? "animate-in slide-in-from-bottom-5" : "animate-out fade-out"
      )}
    >
      <Icon className="h-5 w-5" />
      <p className="text-sm font-medium">{message}</p>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onClose?.(), 300);
        }}
        className="ml-auto"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Toast Container
 * Manages multiple toasts
 */
interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

let toastId = 0;
const toasts: ToastItem[] = [];
const listeners: Array<() => void> = [];

export function showToast(
  message: string,
  type: ToastType = "info",
  duration = 5000
) {
  const id = `toast-${toastId++}`;
  toasts.push({ id, message, type, duration });
  listeners.forEach((listener) => listener());
}

export function useToasts() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener = () => {
      setItems([...toasts]);
    };
    listeners.push(listener);
    setItems([...toasts]);

    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  const removeToast = (id: string) => {
    const index = toasts.findIndex((t) => t.id === id);
    if (index > -1) {
      toasts.splice(index, 1);
      listeners.forEach((listener) => listener());
    }
  };

  return { items, removeToast };
}

/**
 * ToastProvider Component
 * Renders all active toasts
 */
export function ToastProvider() {
  const { items, removeToast } = useToasts();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {items.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
