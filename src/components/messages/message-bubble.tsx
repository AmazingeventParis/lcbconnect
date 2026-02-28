"use client";

import { useMemo } from "react";
import Image from "next/image";
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
  attachments?: string[];
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

// Parse content and render mentions as highlighted spans
function renderContent(content: string, isOwn: boolean) {
  // Match @[Name](userId) pattern
  const parts = content.split(/(@\[[^\]]+\]\([^)]+\))/g);

  if (parts.length === 1) return content;

  return parts.map((part, i) => {
    const mentionMatch = part.match(/@\[([^\]]+)\]\(([^)]+)\)/);
    if (mentionMatch) {
      return (
        <span
          key={i}
          className={cn(
            "font-semibold",
            isOwn ? "text-blue-200" : "text-[#1E3A5F]"
          )}
        >
          @{mentionMatch[1]}
        </span>
      );
    }
    return part;
  });
}

export function MessageBubble({
  content,
  attachments,
  createdAt,
  sender,
  isOwn,
  showAvatar,
  showName,
}: MessageBubbleProps) {
  const time = useMemo(() => formatTime(createdAt), [createdAt]);
  const fullDate = useMemo(() => formatFullDate(createdAt), [createdAt]);

  const imageUrls = (attachments ?? []).filter(
    (url) => url.match(/\.(jpg|jpeg|png|gif|webp)($|\?)/i) || url.includes("lcb-attachments")
  );

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
              <div className="flex flex-col gap-1">
                {/* Image attachments */}
                {imageUrls.length > 0 && (
                  <div className={cn(
                    "rounded-2xl overflow-hidden",
                    isOwn ? "rounded-br-md" : "rounded-bl-md"
                  )}>
                    {imageUrls.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Image
                          src={url}
                          alt="Image jointe"
                          width={280}
                          height={280}
                          className="max-w-[280px] max-h-[280px] object-cover rounded-2xl"
                          style={{ width: "auto", height: "auto" }}
                          unoptimized
                        />
                      </a>
                    ))}
                  </div>
                )}

                {/* Text content (skip if it's just the photo emoji placeholder) */}
                {content && content !== "📷 Photo" && (
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap animate-slide-in-message",
                      isOwn
                        ? "bg-[#1E3A5F] text-white rounded-br-md"
                        : "bg-gray-100 text-gray-900 rounded-bl-md"
                    )}
                  >
                    {renderContent(content, isOwn)}
                  </div>
                )}
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
