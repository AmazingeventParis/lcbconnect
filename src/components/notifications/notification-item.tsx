"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Heart,
  MessageCircle,
  Reply,
  Calendar,
  Wrench,
  AlertTriangle,
  Mail,
  Shield,
  FileText,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/supabase/types";

const TYPE_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; bg: string }
> = {
  like: {
    icon: Heart,
    color: "text-red-500",
    bg: "bg-red-50",
  },
  comment: {
    icon: MessageCircle,
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  reply: {
    icon: Reply,
    color: "text-indigo-500",
    bg: "bg-indigo-50",
  },
  event: {
    icon: Calendar,
    color: "text-green-500",
    bg: "bg-green-50",
  },
  service: {
    icon: Wrench,
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
  complaint: {
    icon: AlertTriangle,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
  },
  message: {
    icon: Mail,
    color: "text-purple-500",
    bg: "bg-purple-50",
  },
  admin: {
    icon: Shield,
    color: "text-slate-600",
    bg: "bg-slate-100",
  },
  document: {
    icon: FileText,
    color: "text-teal-500",
    bg: "bg-teal-50",
  },
  directory: {
    icon: BookOpen,
    color: "text-cyan-600",
    bg: "bg-cyan-50",
  },
};

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

export function NotificationItem({
  notification,
  onMarkAsRead,
}: NotificationItemProps) {
  const router = useRouter();
  const supabase = createClient();

  const config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.admin;
  const Icon = config.icon;

  const handleClick = async () => {
    // Mark as read if not already
    if (!notification.is_read) {
      await (supabase as any)
        .from("lcb_notifications")
        .update({ is_read: true })
        .eq("id", notification.id);

      onMarkAsRead(notification.id);
    }

    // Navigate if link exists
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-slate-50 border-l-4",
        notification.is_read
          ? "border-l-transparent bg-white"
          : "border-l-[#D4A853] bg-[#D4A853]/10"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 flex items-center justify-center size-10 rounded-full",
          config.bg
        )}
      >
        <Icon className={cn("size-5", config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm",
            notification.is_read
              ? "text-slate-700"
              : "text-slate-900 font-semibold"
          )}
        >
          {notification.title}
        </p>
        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
          {notification.body}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
            locale: fr,
          })}
        </p>
      </div>

      {/* Unread dot */}
      {!notification.is_read && (
        <div className="flex-shrink-0 mt-2">
          <div className="size-2.5 rounded-full bg-[#D4A853]" />
        </div>
      )}
    </button>
  );
}
