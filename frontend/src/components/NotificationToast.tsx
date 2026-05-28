"use client";

import { useState, useEffect, useCallback } from "react";

export type NotificationType = "success" | "info" | "warning" | "error";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationToastProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

const typeStyles: Record<NotificationType, { bg: string; border: string; icon: string }> = {
  success: {
    bg: "bg-success/10",
    border: "border-success/30",
    icon: "✓",
  },
  info: {
    bg: "bg-primary/10",
    border: "border-primary/30",
    icon: "ℹ",
  },
  warning: {
    bg: "bg-warning/10",
    border: "border-warning/30",
    icon: "⚠",
  },
  error: {
    bg: "bg-error/10",
    border: "border-error/30",
    icon: "✕",
  },
};

function NotificationToast({ notification, onDismiss }: NotificationToastProps) {
  const style = typeStyles[notification.type];
  const duration = notification.duration ?? 5000;

  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => onDismiss(notification.id), duration);
    return () => clearTimeout(timer);
  }, [notification.id, duration, onDismiss]);

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border ${style.bg} ${style.border} animate-slide-in-right shadow-lg max-w-sm`}
      role="alert"
    >
      <span className="text-lg mt-0.5 shrink-0">{style.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text">{notification.title}</p>
        {notification.message && (
          <p className="text-xs text-text-muted mt-0.5">{notification.message}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(notification.id)}
        className="text-text-muted hover:text-text transition-colors shrink-0 ml-2"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (n: Omit<Notification, "id"> & { id?: string }) => {
      const id = n.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setNotifications((prev) => [...prev, { ...n, id }]);
    },
    []
  );

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const NotificationContainer = useCallback(
    () =>
      notifications.length > 0 ? (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
          {notifications.map((n) => (
            <NotificationToast
              key={n.id}
              notification={n}
              onDismiss={dismissNotification}
            />
          ))}
        </div>
      ) : null,
    [notifications, dismissNotification]
  );

  return { notifications, addNotification, dismissNotification, NotificationContainer };
}
