"use client";

import { useCallback, useEffect, useState } from "react";
import { Anchor, Plus, ExternalLink, MapPin, Calendar, AlertTriangle, Ship } from "lucide-react";
import { format, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import type { Profile, AvisBatellerie } from "@/lib/supabase/types";
import { hasMinRole } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AvisCard } from "./avis-card";
import { CreateAvisDialog } from "./create-avis-dialog";

type AvisWithAuthor = AvisBatellerie & {
  author: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
};

interface NtsNotice {
  id: string;
  title: string;
  number: string;
  organisation: string;
  dateIssue: string;
  dateStart: string;
  dateEnd: string;
  fairways: string[];
  limitations: string[];
  messageType: string;
}

const LIMITATION_LABELS: Record<string, { label: string; color: string }> = {
  OBSTRU: { label: "Obstruction", color: "bg-red-100 text-red-800" },
  NOSERV: { label: "Hors service", color: "bg-red-100 text-red-800" },
  CAUTIO: { label: "Vigilance", color: "bg-amber-100 text-amber-800" },
  AVADEP: { label: "Tirant d'eau", color: "bg-blue-100 text-blue-800" },
  NOLIM: { label: "Normal", color: "bg-green-100 text-green-800" },
  CLOSED: { label: "Ferme", color: "bg-red-100 text-red-800" },
  RESTR: { label: "Restriction", color: "bg-amber-100 text-amber-800" },
};

function NtsCard({ notice }: { notice: NtsNotice }) {
  const isExpired = notice.dateEnd && notice.dateEnd !== "9999-12-31"
    ? isPast(new Date(notice.dateEnd))
    : false;

  const isUrgent = notice.limitations.some((l) =>
    ["OBSTRU", "NOSERV", "CLOSED"].includes(l)
  );

  return (
    <Card className={`gap-0 py-0 transition-shadow hover:shadow-md ${isUrgent ? "border-red-500 border-2" : ""} ${isExpired ? "opacity-60" : ""}`}>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-full bg-blue-100">
              <Ship className="size-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-sm">VNF - EuRIS</p>
              <p className="text-xs text-muted-foreground">
                Avis n°{notice.number}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {notice.limitations.map((lim) => {
              const info = LIMITATION_LABELS[lim];
              if (!info) return null;
              return (
                <Badge key={lim} className={`text-xs ${info.color}`}>
                  {lim === "OBSTRU" || lim === "NOSERV" || lim === "CLOSED" ? (
                    <AlertTriangle className="h-3 w-3 mr-1" />
                  ) : null}
                  {info.label}
                </Badge>
              );
            })}
            {isExpired && (
              <Badge variant="secondary" className="text-xs">Expire</Badge>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-base mb-1">{notice.title}</h3>

        {/* Info */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-2">
          {notice.fairways.length > 0 && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span>{notice.fairways.join(", ")}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {format(new Date(notice.dateStart), "dd MMM yyyy", { locale: fr })}
              {notice.dateEnd && notice.dateEnd !== "9999-12-31" && (
                <> &rarr; {format(new Date(notice.dateEnd), "dd MMM yyyy", { locale: fr })}</>
              )}
            </span>
          </div>
          <a
            href={`https://www.eurisportal.eu/nts/details/${notice.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Details EuRIS
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

interface AvisClientProps {
  profile: Profile;
}

export function AvisClient({ profile }: AvisClientProps) {
  const supabase = createClient();
  const [avisList, setAvisList] = useState<AvisWithAuthor[]>([]);
  const [ntsNotices, setNtsNotices] = useState<NtsNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [ntsLoading, setNtsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("officiels");
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

  const fetchNts = useCallback(async () => {
    setNtsLoading(true);
    try {
      const res = await fetch("/api/nts");
      if (res.ok) {
        const data = await res.json();
        setNtsNotices(data.notices || []);
      }
    } catch {
      /* ignore */
    }
    setNtsLoading(false);
  }, []);

  useEffect(() => {
    fetchAvis();
    fetchNts();
  }, [fetchAvis, fetchNts]);

  function handleCreated() {
    setDialogOpen(false);
    fetchAvis();
  }

  const now = new Date();

  const filteredAvis = avisList.filter((avis) => {
    if (filter === "urgents_internes") return avis.is_urgent;
    if (filter === "en_cours") {
      if (!avis.valid_until) return true;
      return new Date(avis.valid_until) > now;
    }
    return true;
  });

  // NTS: filtrer les urgents (OBSTRU, NOSERV, CLOSED)
  const ntsUrgent = ntsNotices.filter((n) =>
    n.limitations.some((l) => ["OBSTRU", "NOSERV", "CLOSED"].includes(l))
  );

  const isLoading = filter === "officiels" || filter === "urgents" ? ntsLoading : loading;

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* En-tete */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Avis a la batellerie</h1>
          <p className="text-muted-foreground mt-1">
            Avis officiels VNF Ile-de-France et avis internes.
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
            <TabsTrigger value="officiels">
              Officiels IDF ({ntsNotices.length})
            </TabsTrigger>
            <TabsTrigger value="urgents">
              Urgents ({ntsUrgent.length})
            </TabsTrigger>
            <TabsTrigger value="internes">
              Internes ({avisList.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="officiels" className="mt-0" />
          <TabsContent value="urgents" className="mt-0" />
          <TabsContent value="internes" className="mt-0" />
        </Tabs>
      </div>

      {/* Liste */}
      {isLoading ? (
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
      ) : filter === "officiels" ? (
        ntsNotices.length === 0 ? (
          <EmptyState
            message="Aucun avis officiel pour l'Ile-de-France."
            isBureau={isBureau}
            onCreateClick={() => setDialogOpen(true)}
          />
        ) : (
          <div className="space-y-4">
            {ntsNotices.map((notice) => (
              <NtsCard key={notice.id} notice={notice} />
            ))}
          </div>
        )
      ) : filter === "urgents" ? (
        ntsUrgent.length === 0 ? (
          <EmptyState
            message="Aucun avis urgent en cours."
            isBureau={isBureau}
            onCreateClick={() => setDialogOpen(true)}
          />
        ) : (
          <div className="space-y-4">
            {ntsUrgent.map((notice) => (
              <NtsCard key={notice.id} notice={notice} />
            ))}
          </div>
        )
      ) : filteredAvis.length === 0 ? (
        <EmptyState
          message="Aucun avis interne publie."
          isBureau={isBureau}
          onCreateClick={() => setDialogOpen(true)}
        />
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

function EmptyState({
  message,
  isBureau,
  onCreateClick,
}: {
  message: string;
  isBureau: boolean;
  onCreateClick: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Anchor className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">Aucun avis</h3>
      <p className="text-muted-foreground mt-1 max-w-md">{message}</p>
      {isBureau && (
        <Button onClick={onCreateClick} className="mt-4">
          <Plus className="h-4 w-4" />
          Publier un avis
        </Button>
      )}
    </div>
  );
}
