"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Document } from "@/lib/supabase/types";
import {
  DOCUMENT_CATEGORIES,
  type DocumentCategory,
  hasMinRole,
  type Role,
} from "@/lib/constants";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentCard } from "./document-card";
import { UploadDocumentDialog } from "./upload-document-dialog";

interface DocumentsClientProps {
  profile: Profile;
}

export function DocumentsClient({ profile }: DocumentsClientProps) {
  const supabase = createClient();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("toutes");
  const [yearFilter, setYearFilter] = useState<string>("toutes");
  const [dialogOpen, setDialogOpen] = useState(false);

  const canUpload = hasMinRole(profile.role, "ca");

  const fetchDocuments = useCallback(async () => {
    setLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from("lcb_documents")
      .select("*")
      .order("year", { ascending: false })
      .order("created_at", { ascending: false });

    if (categoryFilter !== "toutes") {
      query = query.eq("category", categoryFilter);
    }

    if (yearFilter !== "toutes") {
      query = query.eq("year", parseInt(yearFilter));
    }

    const { data, error } = await query;

    if (!error && data) {
      setDocuments(data as Document[]);
    }

    setLoading(false);
  }, [supabase, categoryFilter, yearFilter]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Filtrer les documents par role de l'utilisateur (cote client)
  const accessibleDocuments = useMemo(() => {
    return documents.filter((doc) =>
      hasMinRole(profile.role, doc.min_role as Role)
    );
  }, [documents, profile.role]);

  // Extraire les annees disponibles pour le filtre
  const availableYears = useMemo(() => {
    const years = new Set(documents.map((doc) => doc.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [documents]);

  function handleCreated() {
    setDialogOpen(false);
    fetchDocuments();
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* En-tete */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-muted-foreground mt-1">
            Consultez les documents officiels de l&apos;association.
          </p>
        </div>
        {canUpload && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Ajouter un document
          </Button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="toutes">Toutes les catégories</SelectItem>
            {Object.entries(DOCUMENT_CATEGORIES).map(([key, val]) => (
              <SelectItem key={key} value={key}>
                {val.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Année" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="toutes">Toutes les années</SelectItem>
            {availableYears.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Liste des documents */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border p-5 space-y-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : accessibleDocuments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Aucun document</h3>
          <p className="text-muted-foreground mt-1 max-w-md">
            {categoryFilter !== "toutes" || yearFilter !== "toutes"
              ? "Aucun document ne correspond aux filtres sélectionnés."
              : "Aucun document n'a encore été ajouté."}
          </p>
          {canUpload && (
            <Button onClick={() => setDialogOpen(true)} className="mt-4">
              <Plus className="h-4 w-4" />
              Ajouter un document
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {accessibleDocuments.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      )}

      {/* Dialogue d'ajout */}
      {canUpload && (
        <UploadDocumentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          profile={profile}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
