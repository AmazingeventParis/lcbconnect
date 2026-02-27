"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { ImageIcon, MapPin } from "lucide-react";

import type { Profile, Complaint } from "@/lib/supabase/types";
import {
  COMPLAINT_STATUSES,
  COMPLAINT_PRIORITIES,
  type ComplaintStatus,
  type ComplaintPriority,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type ComplaintWithAuthor = Complaint & {
  author: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
};

interface ComplaintCardProps {
  complaint: ComplaintWithAuthor;
}

const STATUS_COLORS: Record<string, string> = {
  soumise: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  en_cours:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  resolue: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejetee: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const PRIORITY_COLORS: Record<string, string> = {
  basse: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  normale: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  haute: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  urgente: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ComplaintCard({ complaint }: ComplaintCardProps) {
  const statusInfo =
    COMPLAINT_STATUSES[complaint.status as ComplaintStatus] ??
    COMPLAINT_STATUSES.soumise;
  const priorityInfo =
    COMPLAINT_PRIORITIES[complaint.priority as ComplaintPriority] ??
    COMPLAINT_PRIORITIES.normale;

  return (
    <Link href={`/complaints/${complaint.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer gap-0 py-0">
        <CardContent className="p-5">
          {/* Author & Meta */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar size="lg">
                <AvatarImage
                  src={complaint.author?.avatar_url ?? undefined}
                  alt={complaint.author?.full_name ?? ""}
                />
                <AvatarFallback>
                  {complaint.author?.full_name
                    ? getInitials(complaint.author.full_name)
                    : "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">
                  {complaint.author?.full_name ?? "Utilisateur inconnu"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(complaint.created_at), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={cn(
                  "text-xs",
                  PRIORITY_COLORS[complaint.priority] ?? PRIORITY_COLORS.normale
                )}
              >
                {priorityInfo.label}
              </Badge>
              <Badge
                className={cn(
                  "text-xs",
                  STATUS_COLORS[complaint.status] ?? STATUS_COLORS.soumise
                )}
              >
                {statusInfo.label}
              </Badge>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-base mb-1 line-clamp-1">
            {complaint.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {complaint.description}
          </p>

          {/* Footer: location & photo count */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {complaint.location_name && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="line-clamp-1">{complaint.location_name}</span>
              </div>
            )}
            {complaint.photos && complaint.photos.length > 0 && (
              <div className="flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5" />
                <span>
                  {complaint.photos.length} photo
                  {complaint.photos.length > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
