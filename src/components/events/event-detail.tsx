"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, isPast, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Download,
  Loader2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { Profile, Event } from "@/lib/supabase/types";
import { hasMinRole } from "@/lib/constants";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Participant = {
  user_id: string;
  created_at: string;
  profile: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface EventDetailProps {
  eventId: string;
  profile: Profile;
}

export function EventDetail({ eventId, profile }: EventDetailProps) {
  const supabase = createClient();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({
    title: "",
    description: "",
    location: "",
    start_date: "",
    end_date: "",
    max_participants: "",
  });
  const [saving, setSaving] = useState(false);

  const isAdmin = hasMinRole(profile.role, "ca");

  const fetchEvent = useCallback(async () => {
    setLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("lcb_events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (error || !data) {
      toast.error("Événement introuvable.");
      router.push("/events");
      return;
    }

    setEvent(data as Event);

    // Fetch edit data
    setEditData({
      title: data.title,
      description: data.description,
      location: data.location,
      start_date: data.start_date.slice(0, 16),
      end_date: data.end_date.slice(0, 16),
      max_participants: data.max_participants?.toString() ?? "",
    });

    // Fetch registrations with profiles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: regData } = await (supabase as any)
      .from("lcb_event_registrations")
      .select("user_id, created_at, profile:lcb_profiles!user_id(id, full_name, avatar_url)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (regData) {
      setParticipants(regData as Participant[]);
      setIsRegistered(
        (regData as Participant[]).some((r) => r.user_id === profile.id)
      );
    }

    setLoading(false);
  }, [supabase, eventId, router, profile.id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  async function handleRegister() {
    if (!event) return;
    setRegistering(true);

    if (isRegistered) {
      // Unregister
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("lcb_event_registrations")
        .delete()
        .eq("event_id", event.id)
        .eq("user_id", profile.id);

      if (error) {
        toast.error("Erreur lors de la désinscription.");
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("lcb_events")
          .update({
            registrations_count: Math.max(0, event.registrations_count - 1),
          })
          .eq("id", event.id);

        toast.success("Désinscription confirmée.");
        fetchEvent();
      }
    } else {
      // Check max
      if (
        event.max_participants !== null &&
        event.registrations_count >= event.max_participants
      ) {
        toast.error("Cet événement est complet.");
        setRegistering(false);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("lcb_event_registrations")
        .insert({
          event_id: event.id,
          user_id: profile.id,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("Vous êtes déjà inscrit à cet événement.");
        } else {
          toast.error("Erreur lors de l'inscription.");
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("lcb_events")
          .update({
            registrations_count: event.registrations_count + 1,
          })
          .eq("id", event.id);

        toast.success("Inscription confirmée !");
        fetchEvent();
      }
    }

    setRegistering(false);
  }

  async function handleSaveEdit() {
    if (!event) return;
    setSaving(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      title: editData.title,
      description: editData.description,
      location: editData.location,
      start_date: new Date(editData.start_date).toISOString(),
      end_date: new Date(editData.end_date).toISOString(),
      max_participants: editData.max_participants
        ? parseInt(editData.max_participants, 10)
        : null,
      updated_at: new Date().toISOString(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("lcb_events")
      .update(updateData)
      .eq("id", event.id);

    if (error) {
      toast.error("Erreur lors de la mise à jour.");
    } else {
      toast.success("Événement mis à jour.");
      setEditOpen(false);
      fetchEvent();
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="rounded-xl border p-6 space-y-4">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!event) return null;

  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);
  const eventPast = isPast(startDate) && !isToday(startDate);
  const isFull =
    event.max_participants !== null &&
    event.registrations_count >= event.max_participants;

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* Back link */}
      <Link
        href="/events"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux événements
      </Link>

      <Card className="gap-0 py-0">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold">{event.title}</h1>
              {eventPast && (
                <Badge variant="secondary" className="mt-2">
                  Événement terminé
                </Badge>
              )}
            </div>
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-4 w-4" />
                Modifier
              </Button>
            )}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-3 text-sm">
              <div className="rounded-lg bg-primary/10 p-2">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">
                  {format(startDate, "EEEE d MMMM yyyy", { locale: fr })}
                </p>
                {format(startDate, "yyyy-MM-dd") !==
                  format(endDate, "yyyy-MM-dd") && (
                  <p className="text-muted-foreground text-xs">
                    au {format(endDate, "EEEE d MMMM yyyy", { locale: fr })}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="rounded-lg bg-primary/10 p-2">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">
                  {format(startDate, "HH:mm")} - {format(endDate, "HH:mm")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="rounded-lg bg-primary/10 p-2">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">{event.location}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="rounded-lg bg-primary/10 p-2">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">
                  {event.max_participants
                    ? `${event.registrations_count}/${event.max_participants} inscrits`
                    : `${event.registrations_count} inscrits`}
                </p>
                {isFull && (
                  <p className="text-destructive text-xs">Complet</p>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Description */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold mb-2">Description</h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {event.description}
            </p>
          </div>

          <Separator className="my-6" />

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {!eventPast && (
              <Button
                variant={isRegistered ? "outline" : "default"}
                onClick={handleRegister}
                disabled={registering || (!isRegistered && isFull)}
              >
                {registering ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Traitement...
                  </>
                ) : isRegistered ? (
                  "Se désinscrire"
                ) : isFull ? (
                  "Complet"
                ) : (
                  "S'inscrire"
                )}
              </Button>
            )}

            <Button variant="outline" asChild>
              <a href={`/api/events/${event.id}/ics`} download>
                <Download className="h-4 w-4" />
                Exporter ICS
              </a>
            </Button>
          </div>

          <Separator className="my-6" />

          {/* Participants */}
          <div>
            <h2 className="text-sm font-semibold mb-3">
              Participants ({participants.length})
            </h2>
            {participants.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun participant pour le moment.
              </p>
            ) : (
              <div className="space-y-2">
                {participants.map((p) => (
                  <div
                    key={p.user_id}
                    className="flex items-center gap-3 py-1.5"
                  >
                    <Avatar size="sm">
                      <AvatarImage
                        src={p.profile?.avatar_url ?? undefined}
                        alt={p.profile?.full_name ?? ""}
                      />
                      <AvatarFallback>
                        {p.profile?.full_name
                          ? getInitials(p.profile.full_name)
                          : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {p.profile?.full_name ?? "Utilisateur inconnu"}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      Inscrit le{" "}
                      {format(new Date(p.created_at), "d MMM yyyy", {
                        locale: fr,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog (CA/Bureau only) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier l&apos;événement</DialogTitle>
            <DialogDescription>
              Modifiez les informations de l&apos;événement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Titre</label>
              <Input
                value={editData.title}
                onChange={(e) =>
                  setEditData({ ...editData, title: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Description
              </label>
              <Textarea
                value={editData.description}
                onChange={(e) =>
                  setEditData({ ...editData, description: e.target.value })
                }
                rows={5}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Lieu</label>
              <Input
                value={editData.location}
                onChange={(e) =>
                  setEditData({ ...editData, location: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Date de début
                </label>
                <Input
                  type="datetime-local"
                  value={editData.start_date}
                  onChange={(e) =>
                    setEditData({ ...editData, start_date: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Date de fin
                </label>
                <Input
                  type="datetime-local"
                  value={editData.end_date}
                  onChange={(e) =>
                    setEditData({ ...editData, end_date: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Nombre maximum de participants (optionnel)
              </label>
              <Input
                type="number"
                min="1"
                value={editData.max_participants}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    max_participants: e.target.value,
                  })
                }
                placeholder="Illimité"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
