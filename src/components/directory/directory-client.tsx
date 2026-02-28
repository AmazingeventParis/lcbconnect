"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search, BookOpen } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { Profile, DirectoryEntry } from "@/lib/supabase/types";
import { hasMinRole } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DirectoryCard } from "./directory-card";
import { CreateDirectoryDialog } from "./create-directory-dialog";

const DIRECTORY_CATEGORIES: Record<string, string> = {
  electricite: "Électricité",
  chauffage: "Chauffage / Plomberie",
  ramonage: "Ramonage",
  mecanique: "Mécanique moteur",
  peinture: "Peinture / Carénage",
  boiserie: "Boiserie / Menuiserie",
  accastillage: "Accastillage",
  soudure: "Soudure / Métallerie",
  voilerie: "Voilerie / Sellerie",
  electronique: "Électronique / Navigation",
  nettoyage: "Nettoyage / Entretien",
  grutage: "Grutage / Manutention",
  expertise: "Expertise / Contrôle technique",
  assurance: "Assurance maritime",
  shipchandler: "Shipchandler",
  autre: "Autre",
};

interface DirectoryClientProps {
  profile: Profile;
}

export function DirectoryClient({ profile }: DirectoryClientProps) {
  const supabase = createClient();
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("toutes");
  const [dialogOpen, setDialogOpen] = useState(false);

  const isAdmin = hasMinRole(profile.role, "ca");

  const fetchEntries = useCallback(async () => {
    setLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from("lcb_directory")
      .select("*")
      .order("rating_avg", { ascending: false });

    // Non-admin only see approved entries
    if (!isAdmin) {
      query = query.eq("is_approved", true);
    }

    if (categoryFilter !== "toutes") {
      query = query.eq("category", categoryFilter);
    }

    const { data, error } = await query;

    if (!error && data) {
      setEntries(data as DirectoryEntry[]);
    }

    setLoading(false);
  }, [supabase, isAdmin, categoryFilter]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  function handleCreated() {
    setDialogOpen(false);
    fetchEntries();
  }

  // Client-side search filter
  const filteredEntries = entries.filter((entry) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      entry.name.toLowerCase().includes(q) ||
      entry.description.toLowerCase().includes(q) ||
      (entry.address && entry.address.toLowerCase().includes(q))
    );
  });

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Annuaire</h1>
          <p className="text-muted-foreground mt-1">
            Artisans et prestataires recommandés par les membres.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Proposer un prestataire
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, spécialité, zone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="toutes">Toutes les catégories</SelectItem>
            {Object.entries(DIRECTORY_CATEGORIES).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl border p-5 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">
            Aucun prestataire trouvé
          </h3>
          <p className="text-muted-foreground mt-1 max-w-md">
            {searchQuery
              ? `Aucun résultat pour "${searchQuery}".`
              : "Aucun prestataire dans l'annuaire pour le moment. Proposez le premier !"}
          </p>
          <Button onClick={() => setDialogOpen(true)} className="mt-4">
            <Plus className="h-4 w-4" />
            Proposer un prestataire
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEntries.map((entry) => (
            <DirectoryCard
              key={entry.id}
              entry={entry}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CreateDirectoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        profile={profile}
        onCreated={handleCreated}
      />
    </div>
  );
}

export { DIRECTORY_CATEGORIES };
