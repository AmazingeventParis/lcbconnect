"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/supabase/types";

interface MessageBubbleProps {
  content: string;
  createdAt: string;
  sender: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
  isOwn: boolean;
  showAvatar: boolean;
  showName: boolean;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function MessageBubble({
  content,
  createdAt,
  sender,
  isOwn,
  showAvatar,
  showName,
}: MessageBubbleProps) {
  const time = useMemo(() => formatTime(createdAt), [createdAt]);
  const fullDate = useMemo(() => formatFullDate(createdAt), [createdAt]);

  return (
    <div
      className={cn(
        "flex items-end gap-2 px-4",
        isOwn ? "flex-row-reverse" : "flex-row",
        showAvatar ? "mb-2" : "mb-0.5"
      )}
    >
      {/* Avatar placeholder - only show avatar on first message of group */}
      <div className="w-8 shrink-0">
        {showAvatar && !isOwn && sender && (
          <Avatar size="sm" className="size-8">
            {sender.avatar_url && (
              <AvatarImage src={sender.avatar_url} alt={sender.full_name} />
            )}
            <AvatarFallback className="text-xs">
              {getInitials(sender.full_name)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Message content */}
      <div
        className={cn(
          "flex flex-col max-w-[70%] min-w-0",
          isOwn ? "items-end" : "items-start"
        )}
      >
        {/* Sender name for group chats */}
        {showName && !isOwn && sender && (
          <span className="text-xs text-muted-foreground ml-1 mb-0.5 truncate max-w-full">
            {sender.full_name}
          </span>
        )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap animate-slide-in-message",
                  isOwn
                    ? "bg-teal-500 text-white rounded-br-md"
                    : "bg-gray-100 text-gray-900 rounded-bl-md"
                )}
              >
                {content}
              </div>
            </TooltipTrigger>
            <TooltipContent side={isOwn ? "left" : "right"}>
              <p>{fullDate}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Timestamp shown below last message of a group */}
        {showAvatar && (
          <span
            className={cn(
              "text-[10px] text-muted-foreground mt-0.5",
              isOwn ? "mr-1" : "ml-1"
            )}
          >
            {time}
          </span>
        )}
      </div>
    </div>
  );
}
