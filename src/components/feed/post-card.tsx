"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale/fr";
import {
  HeartIcon,
  MessageCircleIcon,
  FlagIcon,
  PinIcon,
  FileTextIcon,
  WrenchIcon,
  AlertTriangleIcon,
  ShieldIcon,
  AnchorIcon,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { sendNotification } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { POST_TYPES, ROLES } from "@/lib/constants";
import type { PostWithAuthor } from "@/lib/types";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PhotoGallery } from "@/components/feed/photo-gallery";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface PostCardProps {
  post: PostWithAuthor;
  currentUserId: string;
  onLikeChange?: (postId: string, liked: boolean, newCount: number) => void;
}

const POST_TYPE_ICONS: Record<string, React.ElementType> = {
  standard: FileTextIcon,
  service: WrenchIcon,
  plainte: AlertTriangleIcon,
  officiel_bureau: ShieldIcon,
  avis_batellerie: AnchorIcon,
};

const POST_TYPE_COLORS: Record<string, string> = {
  standard: "bg-[#1E3A5F]/10 text-[#1E3A5F]",
  service: "bg-amber-100 text-amber-700",
  plainte: "bg-red-100 text-red-700",
  officiel_bureau: "bg-purple-100 text-purple-700",
  avis_batellerie: "bg-[#1E3A5F]/10 text-[#1E3A5F]",
};

const ROLE_COLORS: Record<string, string> = {
  membre: "bg-gray-100 text-gray-700",
  ca: "bg-blue-100 text-blue-700",
  bureau: "bg-purple-100 text-purple-700",
};

export function PostCard({ post, currentUserId, onLikeChange }: PostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [liked, setLiked] = useState(post.user_has_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [likeLoading, setLikeLoading] = useState(false);
  const supabase = createClient();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleLike = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (likeLoading) return;

      setLikeLoading(true);
      const wasLiked = liked;
      const prevCount = likesCount;

      // Optimistic update
      setLiked(!wasLiked);
      const newCount = wasLiked ? prevCount - 1 : prevCount + 1;
      setLikesCount(newCount);
      onLikeChange?.(post.id, !wasLiked, newCount);

      try {
        if (wasLiked) {
          const { error } = await supabase
            .from("lcb_likes")
            .delete()
            .eq("post_id", post.id)
            .eq("user_id", currentUserId);

          if (error) throw error;

          // Update likes count on the post
          await supabase
            .from("lcb_posts")
            .update({ likes_count: newCount })
            .eq("id", post.id);
        } else {
          const { error } = await supabase
            .from("lcb_likes")
            .insert({ post_id: post.id, user_id: currentUserId });

          if (error) throw error;

          await supabase
            .from("lcb_posts")
            .update({ likes_count: newCount })
            .eq("id", post.id);

          sendNotification({
            type: "like",
            actorId: currentUserId,
            targetType: "post",
            targetId: post.id,
          });
        }
      } catch {
        // Revert optimistic update
        setLiked(wasLiked);
        setLikesCount(prevCount);
        onLikeChange?.(post.id, wasLiked, prevCount);
        toast.error("Erreur lors de la mise à jour du like");
      } finally {
        setLikeLoading(false);
      }
    },
    [liked, likesCount, likeLoading, post.id, currentUserId, supabase, onLikeChange]
  );

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  const handleReport = useCallback(
    async () => {
      if (!reportReason.trim()) {
        toast.error("Veuillez indiquer un motif de signalement.");
        return;
      }

      setReportLoading(true);
      try {
        const { error } = await (supabase as any)
          .from("lcb_reports")
          .insert({
            reporter_id: currentUserId,
            post_id: post.id,
            reason: reportReason.trim(),
            status: "pending",
          });

        if (error) {
          toast.error("Erreur lors du signalement.");
          return;
        }

        sendNotification({
          type: "report",
          actorId: currentUserId,
          targetType: "post",
          targetId: post.id,
        });

        toast.success("Publication signalée. Le bureau sera notifié.");
        setReportOpen(false);
        setReportReason("");
      } catch {
        toast.error("Une erreur inattendue est survenue.");
      } finally {
        setReportLoading(false);
      }
    },
    [reportReason, supabase, currentUserId, post.id]
  );

  const content = post.content;
  const shouldTruncate = content.length > 300 && !expanded;
  const displayContent = shouldTruncate
    ? content.slice(0, 300) + "..."
    : content;

  const TypeIcon = POST_TYPE_ICONS[post.type] ?? FileTextIcon;
  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: fr,
  });

  return (
    <Card className="gap-0 py-0 overflow-hidden transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <Link href={`/armada/${post.author.id}`}>
          <Avatar size="lg">
            {post.author.avatar_url && (
              <AvatarImage
                src={post.author.avatar_url}
                alt={post.author.full_name}
              />
            )}
            <AvatarFallback>
              {getInitials(post.author.full_name)}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/armada/${post.author.id}`}
              className="font-semibold text-sm hover:underline truncate"
            >
              {post.author.full_name}
            </Link>
            {post.author.role !== "membre" && (
              <Badge
                variant="secondary"
                className={cn("text-[10px] py-0", ROLE_COLORS[post.author.role])}
              >
                {ROLES[post.author.role].label}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>{timeAgo}</span>
            {post.is_pinned && (
              <span className="flex items-center gap-0.5 text-amber-600">
                <PinIcon className="size-3" />
                Épinglé
              </span>
            )}
          </div>
        </div>

        <Badge
          variant="secondary"
          className={cn(
            "text-[10px] py-0 shrink-0",
            POST_TYPE_COLORS[post.type]
          )}
        >
          <TypeIcon className="size-3" />
          {POST_TYPES[post.type].label}
        </Badge>
      </div>

      {/* Content */}
      <CardContent className="px-4 py-2 space-y-2">
        {post.title && (
          <h3 className="font-bold text-base">{post.title}</h3>
        )}

        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {displayContent}
          {shouldTruncate && (
            <button
              type="button"
              className="text-primary font-medium ml-1 hover:underline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setExpanded(true);
              }}
            >
              Voir plus
            </button>
          )}
        </div>

        {post.photos && post.photos.length > 0 && (
          <PhotoGallery photos={post.photos} />
        )}
      </CardContent>

      {/* Action bar */}
      <div className="flex items-center border-t px-2 py-1">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "flex-1 gap-1.5 text-muted-foreground",
            liked && "text-red-500"
          )}
          onClick={toggleLike}
          disabled={likeLoading}
        >
          <HeartIcon
            className={cn("size-4", liked && "fill-current animate-like-pulse")}
          />
          <span className="text-xs">{likesCount > 0 ? likesCount : ""}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="flex-1 gap-1.5 text-muted-foreground"
          asChild
        >
          <Link href={`/feed/${post.id}`}>
            <MessageCircleIcon className="size-4" />
            <span className="text-xs">
              {post.comments_count > 0 ? post.comments_count : ""}
            </span>
          </Link>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="flex-1 gap-1.5 text-muted-foreground"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setReportOpen(true);
          }}
        >
          <FlagIcon className="size-4" />
          <span className="text-xs">Signaler</span>
        </Button>
      </div>

      {/* Report dialog */}
      <Dialog
        open={reportOpen}
        onOpenChange={(open) => {
          if (!open) {
            setReportReason("");
          }
          setReportOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Signaler cette publication</DialogTitle>
            <DialogDescription>
              Décrivez pourquoi cette publication est inappropriée. Le bureau
              sera notifié et pourra prendre des mesures.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motif du signalement..."
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReportOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleReport}
              disabled={reportLoading || !reportReason.trim()}
            >
              {reportLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                "Signaler"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
