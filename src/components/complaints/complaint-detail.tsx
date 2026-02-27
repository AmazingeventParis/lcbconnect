"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  ImageIcon,
  MapPin,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { Profile, Complaint, Json } from "@/lib/supabase/types";
import {
  COMPLAINT_STATUSES,
  COMPLAINT_PRIORITIES,
  hasMinRole,
  type ComplaintStatus,
  type ComplaintPriority,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type ComplaintWithAuthor = Complaint & {
  author: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
};

interface HistoryEntry {
  date: string;
  status: string;
  changed_by: string;
  note?: string;
}

interface ComplaintDetailProps {
  complaintId: string;
  profile: Profile;
}

const STATUS_COLORS: Record<string, string> = {
  soumise: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  en_cours:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  resolue: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejetee: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const PRIORITY_COLORS: Record<string, string> = {
  basse: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  normale: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  haute: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  urgente: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function parseHistory(history: Json): HistoryEntry[] {
  if (!history) return [];
  if (Array.isArray(history)) {
    return history as unknown as HistoryEntry[];
  }
  return [];
}

export function ComplaintDetail({
  complaintId,
  profile,
}: ComplaintDetailProps) {
  const supabase = createClient();
  const router = useRouter();
  const [complaint, setComplaint] = useState<ComplaintWithAuthor | null>(null);
  const [linkedPostId, setLinkedPostId] = useState<string | null>(null);
  const [members, setMembers] = useState<
    Pick<Profile, "id" | "full_name">[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [statusNote, setStatusNote] = useState("");

  const isAdmin = hasMinRole(profile.role, "ca");

  const fetchComplaint = useCallback(async () => {
    setLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("lcb_complaints")
      .select("*, author:lcb_profiles!author_id(id, full_name, avatar_url)")
      .eq("id", complaintId)
      .single();

    if (error || !data) {
      toast.error("Plainte introuvable.");
      router.push("/complaints");
      return;
    }

    setComplaint(data as ComplaintWithAuthor);

    // Check for linked post
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: postData } = await (supabase as any)
      .from("lcb_posts")
      .select("id")
      .eq("linked_complaint_id", complaintId)
      .maybeSingle();

    if (postData) {
      setLinkedPostId(postData.id);
    }

    setLoading(false);
  }, [supabase, complaintId, router]);

  const fetchMembers = useCallback(async () => {
    if (!isAdmin) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("lcb_profiles")
      .select("id, full_name")
      .eq("status", "approved")
      .order("full_name");

    if (data) {
      setMembers(data);
    }
  }, [supabase, isAdmin]);

  useEffect(() => {
    fetchComplaint();
    fetchMembers();
  }, [fetchComplaint, fetchMembers]);

  async function handleStatusChange(newStatus: string) {
    if (!complaint) return;
    setUpdating(true);

    const currentHistory = parseHistory(complaint.history);
    const newEntry: HistoryEntry = {
      date: new Date().toISOString(),
      status: newStatus,
      changed_by: profile.full_name,
      note: statusNote || undefined,
    };

    const updatedHistory = [...currentHistory, newEntry];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("lcb_complaints")
      .update({
        status: newStatus,
        history: updatedHistory,
        updated_at: new Date().toISOString(),
      })
      .eq("id", complaint.id);

    if (error) {
      toast.error("Erreur lors de la mise à jour du statut.");
    } else {
      toast.success("Statut mis à jour avec succès.");
      setComplaint({
        ...complaint,
        status: newStatus,
        history: updatedHistory as unknown as Json,
      });
      setStatusNote("");
    }

    setUpdating(false);
  }

  async function handlePriorityChange(newPriority: string) {
    if (!complaint) return;
    setUpdating(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("lcb_complaints")
      .update({
        priority: newPriority,
        updated_at: new Date().toISOString(),
      })
      .eq("id", complaint.id);

    if (error) {
      toast.error("Erreur lors de la mise à jour de la priorité.");
    } else {
      toast.success("Priorité mise à jour avec succès.");
      setComplaint({ ...complaint, priority: newPriority });
    }

    setUpdating(false);
  }

  async function handleAssignChange(userId: string) {
    if (!complaint) return;
    setUpdating(true);

    const assignValue = userId === "non_assigne" ? null : userId;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("lcb_complaints")
      .update({
        assigned_to: assignValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", complaint.id);

    if (error) {
      toast.error("Erreur lors de l'assignation.");
    } else {
      toast.success("Assignation mise à jour avec succès.");
      setComplaint({ ...complaint, assigned_to: assignValue });
    }

    setUpdating(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="rounded-xl border p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!complaint) return null;

  const statusInfo =
    COMPLAINT_STATUSES[complaint.status as ComplaintStatus] ??
    COMPLAINT_STATUSES.soumise;
  const priorityInfo =
    COMPLAINT_PRIORITIES[complaint.priority as ComplaintPriority] ??
    COMPLAINT_PRIORITIES.normale;
  const historyEntries = parseHistory(complaint.history);

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* Back link */}
      <Link
        href="/complaints"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux plaintes
      </Link>

      <Card className="gap-0 py-0">
        <CardContent className="p-6">
          {/* Author */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar size="lg">
                <AvatarImage
                  src={complaint.author?.avatar_url ?? undefined}
                  alt={complaint.author?.full_name ?? ""}
                />
                <AvatarFallback>
                  {complaint.author?.full_name
                    ? getInitials(complaint.author.full_name)
                    : "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {complaint.author?.full_name ?? "Utilisateur inconnu"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(
                    new Date(complaint.created_at),
                    "d MMMM yyyy 'à' HH:mm",
                    { locale: fr }
                  )}{" "}
                  (
                  {formatDistanceToNow(new Date(complaint.created_at), {
                    addSuffix: true,
                    locale: fr,
                  })}
                  )
                </p>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 mb-4">
            <Badge
              className={cn(
                PRIORITY_COLORS[complaint.priority] ?? PRIORITY_COLORS.normale
              )}
            >
              Priorité : {priorityInfo.label}
            </Badge>
            <Badge
              className={cn(
                STATUS_COLORS[complaint.status] ?? STATUS_COLORS.soumise
              )}
            >
              {statusInfo.label}
            </Badge>
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold mb-3">{complaint.title}</h1>

          {/* Description */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap mb-6">
            {complaint.description}
          </p>

          {/* Location */}
          {(complaint.location_name ||
            complaint.latitude ||
            complaint.longitude) && (
            <div className="mb-6 p-3 rounded-lg bg-muted/50 border">
              <h3 className="text-sm font-medium mb-1 flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Localisation
              </h3>
              {complaint.location_name && (
                <p className="text-sm">{complaint.location_name}</p>
              )}
              {(complaint.latitude !== null || complaint.longitude !== null) && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Coordonnées : {complaint.latitude ?? "N/A"},{" "}
                  {complaint.longitude ?? "N/A"}
                </p>
              )}
            </div>
          )}

          {/* Photos */}
          {complaint.photos && complaint.photos.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
                <ImageIcon className="h-4 w-4" />
                Photos ({complaint.photos.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {complaint.photos.map((photo, idx) => (
                  <a
                    key={idx}
                    href={photo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-square rounded-lg overflow-hidden border hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={photo}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Admin Actions */}
          {isAdmin && (
            <div className="border-t pt-4 mt-4 space-y-4">
              <h3 className="text-sm font-semibold">Actions administrateur</h3>

              {/* Status change */}
              <div className="grid gap-2">
                <label className="text-sm font-medium">Changer le statut</label>
                <div className="flex items-center gap-2">
                  <Select
                    value={complaint.status}
                    onValueChange={handleStatusChange}
                    disabled={updating}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(COMPLAINT_STATUSES).map(([key, val]) => (
                        <SelectItem key={key} value={key}>
                          {val.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Note (optionnel)"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Priority change */}
              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  Changer la priorité
                </label>
                <Select
                  value={complaint.priority}
                  onValueChange={handlePriorityChange}
                  disabled={updating}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COMPLAINT_PRIORITIES).map(([key, val]) => (
                      <SelectItem key={key} value={key}>
                        {val.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assign to member */}
              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  Assigner à un membre
                </label>
                <Select
                  value={complaint.assigned_to ?? "non_assigne"}
                  onValueChange={handleAssignChange}
                  disabled={updating}
                >
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Non assigné" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non_assigne">Non assigné</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Status History Timeline */}
          {historyEntries.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Historique des changements
              </h3>
              <div className="space-y-3">
                {historyEntries.map((entry, idx) => {
                  const entryStatusInfo =
                    COMPLAINT_STATUSES[entry.status as ComplaintStatus];
                  return (
                    <div key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                        {idx < historyEntries.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-1" />
                        )}
                      </div>
                      <div className="pb-3">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={cn(
                              "text-xs",
                              STATUS_COLORS[entry.status] ??
                                STATUS_COLORS.soumise
                            )}
                          >
                            {entryStatusInfo?.label ?? entry.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {entry.changed_by}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(
                            new Date(entry.date),
                            "d MMM yyyy 'à' HH:mm",
                            {
                              locale: fr,
                            }
                          )}
                        </p>
                        {entry.note && (
                          <p className="text-sm text-muted-foreground mt-1 italic">
                            {entry.note}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Linked Post */}
          {linkedPostId && (
            <div className="border-t pt-4 mt-4">
              <Link
                href={`/feed#post-${linkedPostId}`}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Voir la publication liée dans le fil
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
