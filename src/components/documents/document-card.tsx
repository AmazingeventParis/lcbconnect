"use client";

import { Download, FileText, Lock } from "lucide-react";

import type { Document } from "@/lib/supabase/types";
import {
  DOCUMENT_CATEGORIES,
  ROLES,
  type DocumentCategory,
  type Role,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface DocumentCardProps {
  document: Document;
}

const CATEGORY_COLORS: Record<string, string> = {
  statuts:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  pv_ag: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  pv_ca: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  reglements:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  courriers:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  divers: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function DocumentCard({ document }: DocumentCardProps) {
  const categoryInfo =
    DOCUMENT_CATEGORIES[document.category as DocumentCategory];
  const categoryLabel = categoryInfo?.label ?? document.category;
  const roleInfo = ROLES[document.min_role as Role];
  const roleLabel = roleInfo?.label ?? document.min_role;

  return (
    <Card className="gap-0 py-0 transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Icone PDF */}
          <div className="flex-shrink-0 rounded-lg bg-red-50 dark:bg-red-950 p-2.5">
            <FileText className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>

          {/* Contenu */}
          <div className="flex-1 min-w-0">
            {/* Titre */}
            <h3 className="font-semibold text-sm line-clamp-2 mb-1">
              {document.title}
            </h3>

            {/* Description */}
            {document.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {document.description}
              </p>
            )}

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge
                className={cn(
                  "text-xs",
                  CATEGORY_COLORS[document.category] ?? CATEGORY_COLORS.divers
                )}
              >
                {categoryLabel}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {document.year}
              </Badge>
              {document.min_role !== "membre" && (
                <Badge
                  variant="secondary"
                  className="text-xs flex items-center gap-1"
                >
                  <Lock className="h-3 w-3" />
                  {roleLabel}
                </Badge>
              )}
            </div>

            {/* Taille du fichier et bouton de telechargement */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {formatFileSize(document.file_size)}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                asChild
              >
                <a
                  href={document.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                >
                  <Download className="h-3.5 w-3.5" />
                  Télécharger
                </a>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
