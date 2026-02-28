"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Anchor,
  MapPin,
  Calendar,
  AlertTriangle,
  Ship,
  ChevronDown,
  Clock,
  FileText,
  Building2,
  ExternalLink,
} from "lucide-react";
import { format, isPast } from "date-fns";
import { fr } from "date-fns/locale";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface NtsNotice {
  id: string;
  title: string;
  tooltip: string;
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
  CLOSED: { label: "Fermé", color: "bg-red-100 text-red-800" },
  RESTR: { label: "Restriction", color: "bg-amber-100 text-amber-800" },
};

function NtsCard({ notice }: { notice: NtsNotice }) {
  const [expanded, setExpanded] = useState(false);

  const isExpired =
    notice.dateEnd && notice.dateEnd !== "9999-12-31"
      ? isPast(new Date(notice.dateEnd))
      : false;

  const isUrgent = notice.limitations.some((l) =>
    ["OBSTRU", "NOSERV", "CLOSED"].includes(l)
  );

  return (
    <Card
      className={cn(
        "gap-0 py-0 transition-shadow hover:shadow-md",
        isUrgent && "border-red-500 border-2",
        isExpired && "opacity-60"
      )}
    >
      <CardContent className="p-0">
        {/* Clickable header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left p-5 flex items-start gap-3"
        >
          <div className="flex items-center justify-center size-10 rounded-full bg-[#1E3A5F]/10 shrink-0 mt-0.5">
            <Ship className="size-5 text-[#1E3A5F]" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm leading-snug">
                  {notice.title}
                </h3>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  {notice.fairways.length > 0 && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {notice.fairways.join(", ")}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(notice.dateStart), "dd MMM", {
                      locale: fr,
                    })}
                    {notice.dateEnd && notice.dateEnd !== "9999-12-31" && (
                      <>
                        {" "}
                        &rarr;{" "}
                        {format(new Date(notice.dateEnd), "dd MMM yyyy", {
                          locale: fr,
                        })}
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {notice.limitations.map((lim) => {
                  const info = LIMITATION_LABELS[lim];
                  if (!info) return null;
                  return (
                    <Badge key={lim} className={`text-xs ${info.color}`}>
                      {isUrgent &&
                      ["OBSTRU", "NOSERV", "CLOSED"].includes(lim) ? (
                        <AlertTriangle className="h-3 w-3 mr-1" />
                      ) : null}
                      {info.label}
                    </Badge>
                  );
                })}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    expanded && "rotate-180"
                  )}
                />
              </div>
            </div>
          </div>
        </button>

        {/* Expandable details */}
        {expanded && (
          <div className="px-5 pb-5 pt-0 border-t border-slate-100">
            <div className="pt-4 space-y-3">
              {/* Tooltip / description */}
              {notice.tooltip && notice.tooltip !== notice.title && (
                <p className="text-sm text-slate-700">{notice.tooltip}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {/* Reference */}
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Référence</p>
                    <p className="font-medium">{notice.number}</p>
                  </div>
                </div>

                {/* Organisation */}
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Organisation
                    </p>
                    <p className="font-medium">{notice.organisation}</p>
                  </div>
                </div>

                {/* Date de publication */}
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Publié le
                    </p>
                    <p className="font-medium">
                      {format(
                        new Date(notice.dateIssue),
                        "dd MMMM yyyy 'a' HH:mm",
                        { locale: fr }
                      )}
                    </p>
                  </div>
                </div>

                {/* Validite */}
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Validité</p>
                    <p className="font-medium">
                      {format(new Date(notice.dateStart), "dd MMM yyyy", {
                        locale: fr,
                      })}
                      {notice.dateEnd && notice.dateEnd !== "9999-12-31"
                        ? ` → ${format(new Date(notice.dateEnd), "dd MMM yyyy", { locale: fr })}`
                        : " → Indéfini"}
                    </p>
                  </div>
                </div>

                {/* Voies */}
                {notice.fairways.length > 0 && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Voies concernées
                      </p>
                      <p className="font-medium">
                        {notice.fairways.join(", ")}
                      </p>
                    </div>
                  </div>
                )}

                {/* Type */}
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="font-medium capitalize">
                      {notice.messageType}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lien vers la fiche EuRIS */}
              <a
                href={`https://www.eurisportal.eu/nts-detail?ntsnumber=${encodeURIComponent(notice.number)}&organisation=${encodeURIComponent(notice.organisation)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-1 text-sm text-[#1E3A5F] hover:text-[#1E3A5F]/80 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Voir la fiche complète sur EuRIS
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AvisClient() {
  const [ntsNotices, setNtsNotices] = useState<NtsNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("tous");

  const fetchNts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/nts");
      if (res.ok) {
        const data = await res.json();
        setNtsNotices(data.notices || []);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNts();
  }, [fetchNts]);

  const ntsUrgent = ntsNotices.filter((n) =>
    n.limitations.some((l) => ["OBSTRU", "NOSERV", "CLOSED"].includes(l))
  );

  const ntsVigilance = ntsNotices.filter((n) =>
    n.limitations.some((l) => ["CAUTIO", "RESTR", "AVADEP"].includes(l))
  );

  const displayedNotices =
    filter === "urgents"
      ? ntsUrgent
      : filter === "vigilance"
        ? ntsVigilance
        : ntsNotices;

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* En-tete */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Avis à la batellerie</h1>
        <p className="text-muted-foreground mt-1">
          Avis officiels VNF pour les voies navigables d&apos;Île-de-France.
        </p>
      </div>

      {/* Filtres */}
      <div className="mb-6">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="tous">
              Tous ({ntsNotices.length})
            </TabsTrigger>
            <TabsTrigger value="urgents">
              Urgents ({ntsUrgent.length})
            </TabsTrigger>
            <TabsTrigger value="vigilance">
              Vigilance ({ntsVigilance.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tous" className="mt-0" />
          <TabsContent value="urgents" className="mt-0" />
          <TabsContent value="vigilance" className="mt-0" />
        </Tabs>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border p-6 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : displayedNotices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Anchor className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Aucun avis</h3>
          <p className="text-muted-foreground mt-1 max-w-md">
            {filter === "urgents"
              ? "Aucun avis urgent en cours pour l'Île-de-France."
              : filter === "vigilance"
                ? "Aucun avis de vigilance en cours."
                : "Aucun avis officiel pour l'Île-de-France."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedNotices.map((notice) => (
            <NtsCard key={notice.id} notice={notice} />
          ))}
        </div>
      )}
    </div>
  );
}
