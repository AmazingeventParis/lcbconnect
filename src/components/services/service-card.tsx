"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { ImageIcon } from "lucide-react";

import type { Profile, Service } from "@/lib/supabase/types";
import {
  SERVICE_CATEGORIES,
  SERVICE_STATUSES,
  type ServiceCategory,
  type ServiceStatus,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type ServiceWithAuthor = Service & {
  author: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
};

interface ServiceCardProps {
  service: ServiceWithAuthor;
}

const STATUS_COLORS: Record<string, string> = {
  ouvert: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  en_cours:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  resolu: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const CATEGORY_COLORS: Record<string, string> = {
  mecanique:
    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  electricite:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  plomberie:
    "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  accastillage:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  navigation:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  autre: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ServiceCard({ service }: ServiceCardProps) {
  const statusInfo =
    SERVICE_STATUSES[service.status as ServiceStatus] ?? SERVICE_STATUSES.ouvert;
  const categoryInfo =
    SERVICE_CATEGORIES[service.category as ServiceCategory] ??
    SERVICE_CATEGORIES.autre;

  return (
    <Link href={`/services/${service.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer gap-0 py-0">
        <CardContent className="p-5">
          {/* Author & Meta */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar size="lg">
                <AvatarImage
                  src={service.author?.avatar_url ?? undefined}
                  alt={service.author?.full_name ?? ""}
                />
                <AvatarFallback>
                  {service.author?.full_name
                    ? getInitials(service.author.full_name)
                    : "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">
                  {service.author?.full_name ?? "Utilisateur inconnu"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(service.created_at), {
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
                  CATEGORY_COLORS[service.category] ?? CATEGORY_COLORS.autre
                )}
              >
                {categoryInfo.label}
              </Badge>
              <Badge
                className={cn(
                  "text-xs",
                  STATUS_COLORS[service.status] ?? STATUS_COLORS.ouvert
                )}
              >
                {statusInfo.label}
              </Badge>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-base mb-1 line-clamp-1">
            {service.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {service.description}
          </p>

          {/* Footer: photo count */}
          {service.photos && service.photos.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ImageIcon className="h-3.5 w-3.5" />
              <span>
                {service.photos.length} photo
                {service.photos.length > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
