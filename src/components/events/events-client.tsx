"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  CalendarDays,
  List,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isFuture,
  isPast,
  isToday,
} from "date-fns";
import { fr } from "date-fns/locale";

import { createClient } from "@/lib/supabase/client";
import type { Profile, Event } from "@/lib/supabase/types";
import { hasMinRole } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EventCard } from "./event-card";
import { CreateEventDialog } from "./create-event-dialog";

interface EventsClientProps {
  profile: Profile;
}

export function EventsClient({ profile }: EventsClientProps) {
  const supabase = createClient();
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showPast, setShowPast] = useState(false);

  const isAdmin = hasMinRole(profile.role, "ca");

  const fetchEvents = useCallback(async () => {
    setLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("lcb_events")
      .select("*")
      .order("start_date", { ascending: true });

    if (!error && data) {
      setEvents(data as Event[]);
    }

    // Fetch current user's registrations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: regData } = await (supabase as any)
      .from("lcb_event_registrations")
      .select("event_id")
      .eq("user_id", profile.id);

    if (regData) {
      setRegistrations(
        new Set((regData as { event_id: string }[]).map((r) => r.event_id))
      );
    }

    setLoading(false);
  }, [supabase, profile.id]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  function handleCreated() {
    setDialogOpen(false);
    fetchEvents();
  }

  const now = new Date();
  const upcomingEvents = events.filter(
    (e) => isFuture(new Date(e.start_date)) || isToday(new Date(e.start_date))
  );
  const pastEvents = events
    .filter((e) => isPast(new Date(e.start_date)) && !isToday(new Date(e.start_date)))
    .reverse();

  // Calendar helpers
  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  // Monday = 0 in our grid (FR locale)
  const startDayOfWeek = (getDay(monthStart) + 6) % 7;
  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  function getEventsForDay(day: Date) {
    return events.filter((e) => isSameDay(new Date(e.start_date), day));
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Evenements</h1>
          <p className="text-muted-foreground mt-1">
            Retrouvez tous les evenements de l&apos;association.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center rounded-lg border">
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("list")}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("calendar")}
              className="rounded-l-none"
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
          </div>

          {isAdmin && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Creer un evenement
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border p-6 space-y-3">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-14 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : view === "calendar" ? (
        /* Calendar View */
        <div>
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold capitalize">
              {format(calendarMonth, "MMMM yyyy", { locale: fr })}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {/* Day headers */}
            {dayNames.map((name) => (
              <div
                key={name}
                className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground"
              >
                {name}
              </div>
            ))}

            {/* Empty cells before month start */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-card p-2 min-h-[80px]" />
            ))}

            {/* Days */}
            {daysInMonth.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentDay = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`bg-card p-2 min-h-[80px] ${
                    !isSameMonth(day, calendarMonth)
                      ? "opacity-40"
                      : ""
                  }`}
                >
                  <span
                    className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                      isCurrentDay
                        ? "bg-primary text-primary-foreground"
                        : ""
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 3).map((evt) => (
                      <a
                        key={evt.id}
                        href={`/events/${evt.id}`}
                        className="block text-[10px] leading-tight bg-primary/10 text-primary rounded px-1 py-0.5 truncate hover:bg-primary/20 transition-colors"
                      >
                        {evt.title}
                      </a>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{dayEvents.length - 3} de plus
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="space-y-6">
          {/* Upcoming Events */}
          {upcomingEvents.length === 0 && pastEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <CalendarDays className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">
                Aucun evenement
              </h3>
              <p className="text-muted-foreground mt-1 max-w-md">
                Il n&apos;y a pas encore d&apos;evenement prevu.
                {isAdmin && " Creez le premier !"}
              </p>
              {isAdmin && (
                <Button onClick={() => setDialogOpen(true)} className="mt-4">
                  <Plus className="h-4 w-4" />
                  Creer un evenement
                </Button>
              )}
            </div>
          ) : (
            <>
              {upcomingEvents.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3">
                    Evenements a venir
                  </h2>
                  <div className="space-y-3">
                    {upcomingEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        isRegistered={registrations.has(event.id)}
                        profile={profile}
                        onRegistrationChange={fetchEvents}
                      />
                    ))}
                  </div>
                </div>
              )}

              {pastEvents.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowPast(!showPast)}
                    className="flex items-center gap-2 text-lg font-semibold text-muted-foreground hover:text-foreground transition-colors mb-3"
                  >
                    Evenements passes ({pastEvents.length})
                    {showPast ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  {showPast && (
                    <div className="space-y-3 opacity-75">
                      {pastEvents.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          isRegistered={registrations.has(event.id)}
                          profile={profile}
                          onRegistrationChange={fetchEvents}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <CreateEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        profile={profile}
        onCreated={handleCreated}
      />
    </div>
  );
}
