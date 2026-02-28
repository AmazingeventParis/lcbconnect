"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  MoreHorizontal,
  Pencil,
  Trash2,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface PostCardProps {
  post: PostWithAuthor;
  currentUserId: string;
  onLikeChange?: (postId: string, liked: boolean, newCount: number) => void;
  onPostDeleted?: (postId: string) => void;
  onPostUpdated?: (postId: string, title: string, content: string) => void;
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

export function PostCard({ post, currentUserId, onLikeChange, onPostDeleted, onPostUpdated }: PostCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [liked, setLiked] = useState(post.user_has_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [likeLoading, setLikeLoading] = useState(false);
  const supabase = createClient();

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title || "");
  const [editContent, setEditContent] = useState(post.content);
  const [editLoading, setEditLoading] = useState(false);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isAuthor = post.author.id === currentUserId;

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

  const handleEdit = async () => {
    if (!editContent.trim()) {
      toast.error("Le contenu ne peut pas être vide.");
      return;
    }

    setEditLoading(true);
    try {
      const { error } = await supabase
        .from("lcb_posts")
        .update({
          title: editTitle.trim() || null,
          content: editContent.trim(),
        })
        .eq("id", post.id)
        .eq("author_id", currentUserId);

      if (error) throw error;

      toast.success("Publication modifiée.");
      setEditOpen(false);
      onPostUpdated?.(post.id, editTitle.trim(), editContent.trim());
      router.refresh();
    } catch {
      toast.error("Erreur lors de la modification.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      // FK CASCADE handles comments and likes deletion
      const { error } = await supabase
        .from("lcb_posts")
        .delete()
        .eq("id", post.id)
        .eq("author_id", currentUserId);

      if (error) throw error;

      toast.success("Publication supprimée.");
      setDeleteOpen(false);
      onPostDeleted?.(post.id);
    } catch {
      toast.error("Erreur lors de la suppression.");
    } finally {
      setDeleteLoading(false);
    }
  };

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

        <div className="flex items-center gap-1 shrink-0">
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] py-0",
              POST_TYPE_COLORS[post.type]
            )}
          >
            <TypeIcon className="size-3" />
            {POST_TYPES[post.type].label}
          </Badge>

          {isAuthor && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="size-8 p-0 text-muted-foreground">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setEditTitle(post.title || "");
                    setEditContent(post.content);
                    setEditOpen(true);
                  }}
                >
                  <Pencil className="size-4" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeleteOpen(true)}
                  variant="destructive"
                >
                  <Trash2 className="size-4" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
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

        {!isAuthor && (
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
        )}
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

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier la publication</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Titre (optionnel)"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <Textarea
              placeholder="Contenu de la publication..."
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleEdit}
              disabled={editLoading || !editContent.trim()}
            >
              {editLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer cette publication ?</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. La publication ainsi que tous ses
              commentaires et likes seront supprimés définitivement.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                "Supprimer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
