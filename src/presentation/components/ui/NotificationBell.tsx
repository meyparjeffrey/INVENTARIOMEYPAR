import { Bell } from "lucide-react";
import * as React from "react";
import { Button } from "./Button";
import { cn } from "../../lib/cn";

interface NotificationBellProps {
  count?: number;
  onClick?: () => void;
  className?: string;
}

/**
 * Badge de notificaciones con contador.
 */
export function NotificationBell({ count = 0, onClick, className }: NotificationBellProps) {
  const hasNotifications = count > 0;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn("relative h-9 w-9 p-0", className)}
      title={hasNotifications ? `${count} notificaciones` : "Notificaciones"}
    >
      <Bell className="h-4 w-4" />
      {hasNotifications && (
        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
      <span className="sr-only">Notificaciones</span>
    </Button>
  );
}

