"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  MapPin,
  Star,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createClient } from "@/lib/supabase/client";
import type {
  Profile,
  DirectoryEntry,
  DirectoryReview,
} from "@/lib/supabase/types";
import { hasMinRole } from "@/lib/constants";
import {
  directoryReviewSchema,
  type DirectoryReviewValues,
} from "@/lib/validators";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { DIRECTORY_CATEGORIES } from "./directory-client";

type ReviewWithAuthor = DirectoryReview & {
  author: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function StarRatingDisplay({
  rating,
  size = 16,
}: {
  rating: number;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${
            star <= Math.round(rating)
              ? "fill-yellow-400 text-yellow-400"
              : "fill-none text-muted-foreground/30"
          }`}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}

function StarRatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (val: number) => void;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={`h-6 w-6 ${
              star <= (hover || value)
                ? "fill-yellow-400 text-yellow-400"
                : "fill-none text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

interface DirectoryDetailProps {
  entryId: string;
  profile: Profile;
}

export function DirectoryDetail({ entryId, profile }: DirectoryDetailProps) {
  const supabase = createClient();
  const router = useRouter();
  const [entry, setEntry] = useState<DirectoryEntry | null>(null);
  const [reviews, setReviews] = useState<ReviewWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [starValue, setStarValue] = useState(0);
  const [hasReviewed, setHasReviewed] = useState(false);

  const isAdmin = hasMinRole(profile.role, "ca");

  const form = useForm<DirectoryReviewValues>({
    resolver: zodResolver(directoryReviewSchema),
    defaultValues: {
      rating: 0,
      comment: "",
    },
  });

  const fetchEntry = useCallback(async () => {
    setLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("lcb_directory")
      .select("*")
      .eq("id", entryId)
      .single();

    if (error || !data) {
      toast.error("Adresse introuvable.");
      router.push("/directory");
      return;
    }

    setEntry(data as DirectoryEntry);

    // Fetch reviews with author info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: reviewData } = await (supabase as any)
      .from("lcb_directory_reviews")
      .select(
        "*, author:lcb_profiles!author_id(id, full_name, avatar_url)"
      )
      .eq("directory_id", entryId)
      .order("created_at", { ascending: false });

    if (reviewData) {
      setReviews(reviewData as ReviewWithAuthor[]);
      setHasReviewed(
        (reviewData as ReviewWithAuthor[]).some(
          (r) => r.author_id === profile.id
        )
      );
    }

    setLoading(false);
  }, [supabase, entryId, router, profile.id]);

  useEffect(() => {
    fetchEntry();
  }, [fetchEntry]);

  async function handleApprove(approve: boolean) {
    if (!entry) return;
    setApproving(true);

    if (approve) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("lcb_directory")
        .update({
          is_approved: true,
          approved_by: profile.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", entry.id);

      if (error) {
        toast.error("Erreur lors de l'approbation.");
      } else {
        toast.success("Adresse approuvée.");
        fetchEntry();
      }
    } else {
      // Reject = delete the entry
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("lcb_directory")
        .delete()
        .eq("id", entry.id);

      if (error) {
        toast.error("Erreur lors du rejet.");
      } else {
        toast.success("Adresse rejetée et supprimée.");
        router.push("/directory");
      }
    }

    setApproving(false);
  }

  async function onSubmitReview(values: DirectoryReviewValues) {
    if (!entry) return;
    if (starValue === 0) {
      toast.error("Veuillez attribuer une note.");
      return;
    }

    setSubmittingReview(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("lcb_directory_reviews")
      .insert({
        directory_id: entry.id,
        author_id: profile.id,
        rating: starValue,
        comment: values.comment || null,
      });

    if (error) {
      if (error.code === "23505") {
        toast.error("Vous avez déjà laissé un avis pour cette adresse.");
      } else {
        toast.error("Erreur lors de l'envoi de l'avis.");
      }
    } else {
      // Recalculate rating average
      const newCount = entry.rating_count + 1;
      const newAvg =
        (entry.rating_avg * entry.rating_count + starValue) / newCount;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("lcb_directory")
        .update({
          rating_avg: Math.round(newAvg * 100) / 100,
          rating_count: newCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", entry.id);

      toast.success("Avis envoyé !");
      form.reset();
      setStarValue(0);
      fetchEntry();
    }

    setSubmittingReview(false);
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

  if (!entry) return null;

  const categoryLabel =
    DIRECTORY_CATEGORIES[entry.category] ?? entry.category;

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* Back link */}
      <Link
        href="/directory"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à l&apos;annuaire
      </Link>

      <Card className="gap-0 py-0">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold">{entry.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">{categoryLabel}</Badge>
                {!entry.is_approved && (
                  <Badge
                    variant="outline"
                    className="border-orange-300 text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-300"
                  >
                    En attente d&apos;approbation
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-3 mb-6">
            <StarRatingDisplay rating={entry.rating_avg} size={20} />
            <span className="text-sm text-muted-foreground">
              {entry.rating_avg.toFixed(1)} / 5 ({entry.rating_count} avis)
            </span>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold mb-2">Description</h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {entry.description}
            </p>
          </div>

          <Separator className="my-6" />

          {/* Contact info */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold mb-3">Informations de contact</h2>
            <div className="space-y-3">
              {entry.phone && (
                <a
                  href={`tel:${entry.phone}`}
                  className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                >
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  {entry.phone}
                </a>
              )}
              {entry.email && (
                <a
                  href={`mailto:${entry.email}`}
                  className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                >
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  {entry.email}
                </a>
              )}
              {entry.website && (
                <a
                  href={entry.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                >
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  {entry.website}
                </a>
              )}
              {entry.address && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  {entry.address}
                </div>
              )}
              {!entry.phone &&
                !entry.email &&
                !entry.website &&
                !entry.address && (
                  <p className="text-sm text-muted-foreground">
                    Aucune information de contact disponible.
                  </p>
                )}
            </div>
          </div>

          {/* Approve/Reject (CA/Bureau) */}
          {isAdmin && !entry.is_approved && (
            <>
              <Separator className="my-6" />
              <div className="mb-6">
                <h2 className="text-sm font-semibold mb-3">
                  Modération
                </h2>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => handleApprove(true)}
                    disabled={approving}
                    size="sm"
                  >
                    {approving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Approuver
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleApprove(false)}
                    disabled={approving}
                    size="sm"
                  >
                    {approving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    Rejeter
                  </Button>
                </div>
              </div>
            </>
          )}

          <Separator className="my-6" />

          {/* Reviews */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold mb-4">
              Avis ({reviews.length})
            </h2>

            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground mb-4">
                Aucun avis pour le moment. Soyez le premier !
              </p>
            ) : (
              <div className="space-y-4 mb-6">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar size="sm">
                        <AvatarImage
                          src={review.author?.avatar_url ?? undefined}
                          alt={review.author?.full_name ?? ""}
                        />
                        <AvatarFallback>
                          {review.author?.full_name
                            ? getInitials(review.author.full_name)
                            : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {review.author?.full_name ?? "Utilisateur inconnu"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(
                            new Date(review.created_at),
                            "d MMMM yyyy",
                            { locale: fr }
                          )}
                        </p>
                      </div>
                      <StarRatingDisplay rating={review.rating} size={14} />
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {review.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leave a review */}
          {!hasReviewed && entry.is_approved && (
            <>
              <Separator className="my-6" />
              <div>
                <h2 className="text-sm font-semibold mb-3">
                  Laisser un avis
                </h2>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmitReview)}
                    className="space-y-4"
                  >
                    {/* Star input */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Votre note
                      </label>
                      <StarRatingInput
                        value={starValue}
                        onChange={(val) => {
                          setStarValue(val);
                          form.setValue("rating", val);
                        }}
                      />
                      {form.formState.errors.rating && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.rating.message}
                        </p>
                      )}
                    </div>

                    {/* Comment */}
                    <FormField
                      control={form.control}
                      name="comment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Commentaire (optionnel)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Partagez votre expérience..."
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      disabled={submittingReview || starValue === 0}
                    >
                      {submittingReview ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Envoi...
                        </>
                      ) : (
                        "Envoyer l'avis"
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            </>
          )}

          {hasReviewed && (
            <p className="text-sm text-muted-foreground italic mt-4">
              Vous avez déjà laissé un avis pour cette adresse.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
