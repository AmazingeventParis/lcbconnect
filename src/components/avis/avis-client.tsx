"use client";

import { useCallback, useEffect, useState } from "react";
import { Anchor, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, AvisBatellerie } from "@/lib/supabase/types";
import { hasMinRole } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AvisCard } from "./avis-card";
import { CreateAvisDialog } from "./create-avis-dialog";

type AvisWithAuthor = AvisBatellerie & {
  author: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
};

interface AvisClientProps {
  profile: Profile;
}

export function AvisClient({ profile }: AvisClientProps) {
  const supabase = createClient();
  const [avisList, setAvisList] = useState<AvisWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("tous");
  const [dialogOpen, setDialogOpen] = useState(false);

  const isBureau = hasMinRole(profile.role, "bureau");

  const fetchAvis = useCallback(async () => {
    setLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = (supabase as any)
      .from("lcb_avis_batellerie")
      .select("*, author:lcb_profiles!author_id(id, full_name, avatar_url)")
      .order("is_urgent", { ascending: false })
      .order("created_at", { ascending: false });

    const { data, error } = await query;

    if (!error && data) {
      setAvisList(data as AvisWithAuthor[]);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchAvis();
  }, [fetchAvis]);

  function handleCreated() {
    setDialogOpen(false);
    fetchAvis();
  }

  const now = new Date();

  const filteredAvis = avisList.filter((avis) => {
    if (filter === "urgents") return avis.is_urgent;
    if (filter === "en_cours") {
      if (!avis.valid_until) return true;
      return new Date(avis.valid_until) > now;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* En-tete */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Avis à la batellerie</h1>
          <p className="text-muted-foreground mt-1">
            Informations officielles et avis de navigation pour les plaisanciers.
          </p>
        </div>
        {isBureau && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Publier un avis
          </Button>
        )}
      </div>

      {/* Filtres */}
      <div className="mb-6">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="tous">Tous</TabsTrigger>
            <TabsTrigger value="urgents">Urgents</TabsTrigger>
            <TabsTrigger value="en_cours">En cours</TabsTrigger>
          </TabsList>

          <TabsContent value="tous" className="mt-0" />
          <TabsContent value="urgents" className="mt-0" />
          <TabsContent value="en_cours" className="mt-0" />
        </Tabs>
      </div>

      {/* Liste des avis */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border p-6 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : filteredAvis.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Anchor className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Aucun avis à la batellerie</h3>
          <p className="text-muted-foreground mt-1 max-w-md">
            {filter === "urgents"
              ? "Il n'y a actuellement aucun avis urgent."
              : filter === "en_cours"
              ? "Il n'y a actuellement aucun avis en cours de validité."
              : "Aucun avis n'a encore été publié."}
          </p>
          {isBureau && (
            <Button onClick={() => setDialogOpen(true)} className="mt-4">
              <Plus className="h-4 w-4" />
              Publier un avis
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAvis.map((avis) => (
            <AvisCard key={avis.id} avis={avis} />
          ))}
        </div>
      )}

      {/* Dialogue de creation */}
      {isBureau && (
        <CreateAvisDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          profile={profile}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
