"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, ExternalLink, ImageIcon } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { Profile, Service } from "@/lib/supabase/types";
import {
  SERVICE_CATEGORIES,
  SERVICE_STATUSES,
  hasMinRole,
  type ServiceCategory,
  type ServiceStatus,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type ServiceWithAuthor = Service & {
  author: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
};

interface ServiceDetailProps {
  serviceId: string;
  profile: Profile;
}

const STATUS_COLORS: Record<string, string> = {
  ouvert: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  en_cours:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  resolu: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const CATEGORY_COLORS: Record<string, string> = {
  mecanique: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  electricite:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  plomberie:
    "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  accastillage:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  navigation:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  autre: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ServiceDetail({ serviceId, profile }: ServiceDetailProps) {
  const supabase = createClient();
  const router = useRouter();
  const [service, setService] = useState<ServiceWithAuthor | null>(null);
  const [linkedPostId, setLinkedPostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchService = useCallback(async () => {
    setLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("lcb_services")
      .select("*, author:lcb_profiles!author_id(id, full_name, avatar_url)")
      .eq("id", serviceId)
      .single();

    if (error || !data) {
      toast.error("Service introuvable.");
      router.push("/services");
      return;
    }

    setService(data as ServiceWithAuthor);

    // Check for linked post
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: postData } = await (supabase as any)
      .from("lcb_posts")
      .select("id")
      .eq("linked_service_id", serviceId)
      .maybeSingle();

    if (postData) {
      setLinkedPostId(postData.id);
    }

    setLoading(false);
  }, [supabase, serviceId, router]);

  useEffect(() => {
    fetchService();
  }, [fetchService]);

  async function handleStatusChange(newStatus: string) {
    if (!service) return;
    setUpdatingStatus(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === "resolu") {
      updateData.resolved_by = profile.id;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("lcb_services")
      .update(updateData)
      .eq("id", service.id);

    if (error) {
      toast.error("Erreur lors de la mise à jour du statut.");
    } else {
      toast.success("Statut mis à jour avec succès.");
      setService({ ...service, status: newStatus, ...updateData });
    }

    setUpdatingStatus(false);
  }

  // Can the current user change status?
  const canChangeStatus =
    service &&
    (service.author_id === profile.id || hasMinRole(profile.role, "ca"));

  // Author can only mark as "resolu", CA/Bureau can set any status
  const isAdmin = hasMinRole(profile.role, "ca");

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

  if (!service) return null;

  const statusInfo =
    SERVICE_STATUSES[service.status as ServiceStatus] ?? SERVICE_STATUSES.ouvert;
  const categoryInfo =
    SERVICE_CATEGORIES[service.category as ServiceCategory] ??
    SERVICE_CATEGORIES.autre;

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* Back link */}
      <Link
        href="/services"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux demandes
      </Link>

      <Card className="gap-0 py-0">
        <CardContent className="p-6">
          {/* Author */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar size="lg">
                <AvatarImage
                  src={service.author?.avatar_url ?? undefined}
                  alt={service.author?.full_name ?? ""}
                />
                <AvatarFallback>
                  {service.author?.full_name
                    ? getInitials(service.author.full_name)
                    : "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {service.author?.full_name ?? "Utilisateur inconnu"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(service.created_at), "d MMMM yyyy 'à' HH:mm", {
                    locale: fr,
                  })}
                  {" "}
                  ({formatDistanceToNow(new Date(service.created_at), {
                    addSuffix: true,
                    locale: fr,
                  })})
                </p>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 mb-4">
            <Badge
              className={cn(
                CATEGORY_COLORS[service.category] ?? CATEGORY_COLORS.autre
              )}
            >
              {categoryInfo.label}
            </Badge>
            <Badge
              className={cn(
                STATUS_COLORS[service.status] ?? STATUS_COLORS.ouvert
              )}
            >
              {statusInfo.label}
            </Badge>
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold mb-3">{service.title}</h1>

          {/* Description */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap mb-6">
            {service.description}
          </p>

          {/* Photos */}
          {service.photos && service.photos.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
                <ImageIcon className="h-4 w-4" />
                Photos ({service.photos.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {service.photos.map((photo, idx) => (
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

          {/* Status Change */}
          {canChangeStatus && (
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-medium mb-2">Changer le statut</h3>
              <div className="flex items-center gap-3">
                {isAdmin ? (
                  <Select
                    value={service.status}
                    onValueChange={handleStatusChange}
                    disabled={updatingStatus}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SERVICE_STATUSES).map(([key, val]) => (
                        <SelectItem key={key} value={key}>
                          {val.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  // Author can only mark as resolved
                  service.status !== "resolu" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange("resolu")}
                      disabled={updatingStatus}
                    >
                      Marquer comme résolu
                    </Button>
                  )
                )}
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
