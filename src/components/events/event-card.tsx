"use client";

import { useState } from "react";
import Link from "next/link";
import { format, isPast, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { MapPin, Clock, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { Event, Profile } from "@/lib/supabase/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EventCardProps {
  event: Event;
  isRegistered: boolean;
  profile: Profile;
  onRegistrationChange: () => void;
}

export function EventCard({
  event,
  isRegistered,
  profile,
  onRegistrationChange,
}: EventCardProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);
  const eventPast = isPast(startDate) && !isToday(startDate);
  const isFull =
    event.max_participants !== null &&
    event.registrations_count >= event.max_participants;

  async function handleRegister(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (eventPast) return;

    setLoading(true);

    if (isRegistered) {
      // Unregister
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("lcb_event_registrations")
        .delete()
        .eq("event_id", event.id)
        .eq("user_id", profile.id);

      if (error) {
        toast.error("Erreur lors de la desinscription.");
      } else {
        // Decrement registrations_count
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("lcb_events")
          .update({
            registrations_count: Math.max(0, event.registrations_count - 1),
          })
          .eq("id", event.id);

        toast.success("Desinscription confirmee.");
        onRegistrationChange();
      }
    } else {
      // Check if full
      if (isFull) {
        toast.error("Cet evenement est complet.");
        setLoading(false);
        return;
      }

      // Register
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("lcb_event_registrations")
        .insert({
          event_id: event.id,
          user_id: profile.id,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("Vous etes deja inscrit a cet evenement.");
        } else {
          toast.error("Erreur lors de l'inscription.");
        }
      } else {
        // Increment registrations_count
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("lcb_events")
          .update({
            registrations_count: event.registrations_count + 1,
          })
          .eq("id", event.id);

        toast.success("Inscription confirmee !");
        onRegistrationChange();
      }
    }

    setLoading(false);
  }

  return (
    <Link href={`/events/${event.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer gap-0 py-0">
        <CardContent className="p-0">
          <div className="flex items-stretch">
            {/* Date block */}
            <div
              className={`flex flex-col items-center justify-center px-4 py-4 min-w-[70px] rounded-l-xl ${
                eventPast
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary/10 text-primary"
              }`}
            >
              <span className="text-2xl font-bold leading-none">
                {format(startDate, "d")}
              </span>
              <span className="text-xs font-medium uppercase mt-1">
                {format(startDate, "MMM", { locale: fr })}
              </span>
              <span className="text-xs mt-0.5">
                {format(startDate, "yyyy")}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-base line-clamp-1">
                    {event.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {event.description}
                  </p>
                </div>
                {eventPast && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    Termine
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                {/* Time */}
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {format(startDate, "HH:mm")} - {format(endDate, "HH:mm")}
                </span>

                {/* Location */}
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[200px]">
                    {event.location}
                  </span>
                </span>

                {/* Participants */}
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {event.max_participants
                    ? `${event.registrations_count}/${event.max_participants} inscrits`
                    : `${event.registrations_count} inscrits`}
                </span>
              </div>

              {/* Registration button */}
              {!eventPast && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant={isRegistered ? "outline" : "default"}
                    onClick={handleRegister}
                    disabled={loading || (!isRegistered && isFull)}
                    className="text-xs"
                  >
                    {loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isRegistered ? (
                      "Se desinscrire"
                    ) : isFull ? (
                      "Complet"
                    ) : (
                      "S'inscrire"
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
