"use client";

import Link from "next/link";
import { Star, Phone, Mail, MapPin, Globe } from "lucide-react";

import type { DirectoryEntry } from "@/lib/supabase/types";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import { DIRECTORY_CATEGORIES } from "./directory-client";

interface DirectoryCardProps {
  entry: DirectoryEntry;
  isAdmin: boolean;
}

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${
            star <= Math.round(rating)
              ? "fill-yellow-400 text-yellow-400"
              : "fill-none text-muted-foreground/30"
          }`}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}

export function DirectoryCard({ entry, isAdmin }: DirectoryCardProps) {
  const categoryLabel =
    DIRECTORY_CATEGORIES[entry.category] ?? entry.category;

  return (
    <Link href={`/directory/${entry.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full gap-0 py-0">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-base line-clamp-1">
              {entry.name}
            </h3>
            {!entry.is_approved && isAdmin && (
              <Badge
                variant="outline"
                className="shrink-0 text-xs border-orange-300 text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-300"
              >
                En attente
              </Badge>
            )}
          </div>

          {/* Category */}
          <Badge variant="secondary" className="text-xs mb-3">
            {categoryLabel}
          </Badge>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {entry.description}
          </p>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-3">
            <StarRating rating={entry.rating_avg} />
            <span className="text-xs text-muted-foreground">
              ({entry.rating_count} avis)
            </span>
          </div>

          {/* Contact info */}
          <div className="space-y-1">
            {entry.phone && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="h-3 w-3 shrink-0" />
                <span className="truncate">{entry.phone}</span>
              </div>
            )}
            {entry.email && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{entry.email}</span>
              </div>
            )}
            {entry.website && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Globe className="h-3 w-3 shrink-0" />
                <span className="truncate">{entry.website}</span>
              </div>
            )}
            {entry.address && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{entry.address}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export { StarRating };
