"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  CalendarDays,
  List,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
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
  isWithinInterval,
  parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";

import { createClient } from "@/lib/supabase/client";
import type { Profile, Event } from "@/lib/supabase/types";
import { hasMinRole } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EventCard } from "./event-card";
import { CreateEventDialog } from "./create-event-dialog";

// Color palette for events in the calendar
const EVENT_COLORS = [
  { bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500", border: "border-blue-200" },
  { bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-500", border: "border-emerald-200" },
  { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500", border: "border-amber-200" },
  { bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-500", border: "border-purple-200" },
  { bg: "bg-rose-100", text: "text-rose-800", dot: "bg-rose-500", border: "border-rose-200" },
  { bg: "bg-cyan-100", text: "text-cyan-800", dot: "bg-cyan-500", border: "border-cyan-200" },
  { bg: "bg-orange-100", text: "text-orange-800", dot: "bg-orange-500", border: "border-orange-200" },
  { bg: "bg-indigo-100", text: "text-indigo-800", dot: "bg-indigo-500", border: "border-indigo-200" },
];

function getEventColor(index: number) {
  return EVENT_COLORS[index % EVENT_COLORS.length];
}

function isEventOnDay(event: Event, day: Date): boolean {
  const start = new Date(event.start_date);
  const end = event.end_date ? new Date(event.end_date) : start;
  // Check if the day falls within the event's date range (comparing dates only)
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const eventStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const eventEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return dayStart >= eventStart && dayStart <= eventEnd;
}

function isMultiDay(event: Event): boolean {
  if (!event.end_date) return false;
  const start = new Date(event.start_date);
  const end = new Date(event.end_date);
  return start.toDateString() !== end.toDateString();
}

interface EventsClientProps {
  profile: Profile;
}

export function EventsClient({ profile }: EventsClientProps) {
  const supabase = createClient();
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "calendar">("calendar");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showPast, setShowPast] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

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
  const startDayOfWeek = (getDay(monthStart) + 6) % 7;
  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  function getEventsForDay(day: Date) {
    return events.filter((e) => isEventOnDay(e, day));
  }

  // Get the event's global index for consistent coloring
  function getEventColorIndex(event: Event): number {
    return events.findIndex((e) => e.id === event.id);
  }

  // Events for selected day panel
  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  // Count events per month for quick stats
  const monthEvents = events.filter((e) => {
    const start = new Date(e.start_date);
    const end = e.end_date ? new Date(e.end_date) : start;
    return (
      (start >= monthStart && start <= monthEnd) ||
      (end >= monthStart && end <= monthEnd) ||
      (start <= monthStart && end >= monthEnd)
    );
  });

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Calendrier 2026</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {events.length} evenements programmes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border">
            <Button
              variant={view === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("calendar")}
              className="rounded-r-none"
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("list")}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {isAdmin && (
            <Button onClick={() => setDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Creer</span>
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
        <div className="space-y-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCalendarMonth(subMonths(calendarMonth, 1));
                setSelectedDay(null);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">
                {format(subMonths(calendarMonth, 1), "MMM", { locale: fr })}
              </span>
            </Button>
            <div className="text-center">
              <h2 className="text-xl font-bold capitalize">
                {format(calendarMonth, "MMMM yyyy", { locale: fr })}
              </h2>
              <p className="text-xs text-muted-foreground">
                {monthEvents.length} evenement{monthEvents.length > 1 ? "s" : ""} ce mois
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCalendarMonth(addMonths(calendarMonth, 1));
                setSelectedDay(null);
              }}
            >
              <span className="hidden sm:inline">
                {format(addMonths(calendarMonth, 1), "MMM", { locale: fr })}
              </span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick month jump */}
          <div className="flex flex-wrap gap-1.5 justify-center">
            {Array.from({ length: 12 }, (_, i) => {
              const month = new Date(2026, i, 1);
              const hasEvents = events.some((e) => {
                const start = new Date(e.start_date);
                const end = e.end_date ? new Date(e.end_date) : start;
                return (
                  (start.getMonth() === i && start.getFullYear() === 2026) ||
                  (end.getMonth() === i && end.getFullYear() === 2026)
                );
              });
              const isCurrent =
                calendarMonth.getMonth() === i &&
                calendarMonth.getFullYear() === 2026;
              return (
                <button
                  key={i}
                  onClick={() => {
                    setCalendarMonth(month);
                    setSelectedDay(null);
                  }}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    isCurrent
                      ? "bg-primary text-primary-foreground font-semibold"
                      : hasEvents
                      ? "bg-primary/10 text-primary hover:bg-primary/20 font-medium"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {format(month, "MMM", { locale: fr })}
                </button>
              );
            })}
          </div>

          {/* Calendar Grid */}
          <div className="rounded-xl border overflow-hidden shadow-sm">
            {/* Day headers */}
            <div className="grid grid-cols-7 bg-muted/50">
              {dayNames.map((name) => (
                <div
                  key={name}
                  className="p-2 text-center text-xs font-semibold text-muted-foreground border-b"
                >
                  {name}
                </div>
              ))}
            </div>

            {/* Calendar body */}
            <div className="grid grid-cols-7">
              {/* Empty cells before month start */}
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="min-h-[44px] md:min-h-[64px] p-1 border-b border-r bg-muted/20"
                />
              ))}

              {/* Days */}
              {daysInMonth.map((day, idx) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentDay = isToday(day);
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const dayOfWeek = (startDayOfWeek + idx) % 7;
                const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() =>
                      setSelectedDay(
                        selectedDay && isSameDay(day, selectedDay) ? null : day
                      )
                    }
                    className={`min-h-[44px] md:min-h-[64px] p-1 md:p-1.5 border-b border-r text-left transition-colors relative ${
                      isSelected
                        ? "bg-primary/5 ring-2 ring-primary ring-inset"
                        : isCurrentDay
                        ? "bg-teal-50"
                        : isWeekend
                        ? "bg-slate-50/50"
                        : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    {/* Day number */}
                    <span
                      className={`text-[10px] md:text-xs font-medium inline-flex items-center justify-center w-5 h-5 rounded-full ${
                        isCurrentDay
                          ? "bg-primary text-primary-foreground font-bold"
                          : isSelected
                          ? "bg-primary/20 text-primary font-bold"
                          : "text-slate-700"
                      }`}
                    >
                      {format(day, "d")}
                    </span>

                    {/* Event indicators */}
                    <div className="mt-0.5 space-y-0.5">
                      {/* Mobile: dots only */}
                      <div className="flex gap-0.5 md:hidden flex-wrap">
                        {dayEvents.slice(0, 4).map((evt) => {
                          const color = getEventColor(getEventColorIndex(evt));
                          return (
                            <span
                              key={evt.id}
                              className={`w-1.5 h-1.5 rounded-full ${color.dot}`}
                            />
                          );
                        })}
                      </div>

                      {/* Desktop: event labels */}
                      <div className="hidden md:block space-y-0.5">
                        {dayEvents.slice(0, 1).map((evt) => {
                          const color = getEventColor(getEventColorIndex(evt));
                          const multi = isMultiDay(evt);
                          const isStart = isSameDay(
                            new Date(evt.start_date),
                            day
                          );
                          return (
                            <div
                              key={evt.id}
                              className={`text-[10px] leading-tight rounded px-1 py-0.5 truncate ${color.bg} ${color.text} font-medium`}
                            >
                              {multi && !isStart ? "↳ " : ""}
                              {evt.title}
                            </div>
                          );
                        })}
                        {dayEvents.length > 1 && (
                          <span className="text-[10px] text-muted-foreground pl-1">
                            +{dayEvents.length - 1}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Detail Panel */}
          {selectedDay && (
            <div className="rounded-xl border bg-white p-4 shadow-sm animate-in slide-in-from-top-2 duration-200">
              <h3 className="font-semibold text-lg capitalize mb-3">
                {format(selectedDay, "EEEE d MMMM yyyy", { locale: fr })}
              </h3>
              {selectedDayEvents.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  Aucun evenement ce jour
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map((evt) => {
                    const color = getEventColor(getEventColorIndex(evt));
                    const start = new Date(evt.start_date);
                    const end = evt.end_date ? new Date(evt.end_date) : null;
                    const multi = isMultiDay(evt);
                    return (
                      <Link
                        key={evt.id}
                        href={`/events/${evt.id}`}
                        className={`block rounded-lg border p-3 hover:shadow-md transition-all ${color.border} ${color.bg}/30`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-1 self-stretch rounded-full ${color.dot} shrink-0`}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm">
                              {evt.title}
                            </h4>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {multi
                                  ? `${format(start, "d MMM", { locale: fr })} - ${end ? format(end, "d MMM", { locale: fr }) : ""}`
                                  : `${format(start, "HH:mm")}${end ? ` - ${format(end, "HH:mm")}` : ""}`}
                              </span>
                              {evt.location && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {evt.location}
                                </span>
                              )}
                            </div>
                            {evt.description && (
                              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                                {evt.description}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={`shrink-0 text-[10px] ${color.text} border-current`}
                          >
                            {isRegistered(evt.id)
                              ? "Inscrit"
                              : "S'inscrire"}
                          </Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Upcoming events list below calendar */}
          {upcomingEvents.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">
                Prochains evenements
              </h2>
              <div className="space-y-2">
                {upcomingEvents.slice(0, 5).map((event) => {
                  const color = getEventColor(getEventColorIndex(event));
                  const start = new Date(event.start_date);
                  const end = event.end_date
                    ? new Date(event.end_date)
                    : null;
                  const multi = isMultiDay(event);
                  return (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className="flex items-center gap-3 rounded-lg border p-3 hover:shadow-sm transition-all bg-white"
                    >
                      <div
                        className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg ${color.bg}`}
                      >
                        <span
                          className={`text-lg font-bold leading-none ${color.text}`}
                        >
                          {format(start, "d")}
                        </span>
                        <span
                          className={`text-[10px] font-medium uppercase ${color.text}`}
                        >
                          {format(start, "MMM", { locale: fr })}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">
                          {event.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {multi ? (
                            <span>
                              {format(start, "d MMM", { locale: fr })} -{" "}
                              {end
                                ? format(end, "d MMM", { locale: fr })
                                : ""}
                            </span>
                          ) : (
                            <span>{format(start, "HH:mm")}</span>
                          )}
                          {event.location && (
                            <>
                              <span>·</span>
                              <span className="truncate">
                                {event.location}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* List View */
        <div className="space-y-6">
          {upcomingEvents.length === 0 && pastEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <CalendarDays className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Aucun evenement</h3>
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

  function isRegistered(eventId: string): boolean {
    return registrations.has(eventId);
  }
}
