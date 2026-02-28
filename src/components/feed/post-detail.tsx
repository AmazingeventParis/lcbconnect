"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale/fr";
import {
  ArrowLeftIcon,
  HeartIcon,
  ShareIcon,
  PinIcon,
  FileTextIcon,
  WrenchIcon,
  AlertTriangleIcon,
  ShieldIcon,
  AnchorIcon,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { POST_TYPES, ROLES } from "@/lib/constants";
import type { PostWithAuthor } from "@/lib/types";
import type { Profile } from "@/lib/supabase/types";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { PhotoGallery } from "@/components/feed/photo-gallery";
import { CommentsSection } from "@/components/feed/comments-section";

interface PostDetailProps {
  post: PostWithAuthor;
  currentUser: Profile;
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

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function PostDetail({ post, currentUser }: PostDetailProps) {
  const [liked, setLiked] = useState(post.user_has_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [likeLoading, setLikeLoading] = useState(false);
  const supabase = createClient();

  const toggleLike = useCallback(async () => {
    if (likeLoading) return;

    setLikeLoading(true);
    const wasLiked = liked;
    const prevCount = likesCount;

    // Optimistic update
    setLiked(!wasLiked);
    const newCount = wasLiked ? prevCount - 1 : prevCount + 1;
    setLikesCount(newCount);

    try {
      if (wasLiked) {
        const { error } = await supabase
          .from("lcb_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", currentUser.id);

        if (error) throw error;

        await supabase
          .from("lcb_posts")
          .update({ likes_count: newCount })
          .eq("id", post.id);
      } else {
        const { error } = await supabase
          .from("lcb_likes")
          .insert({ post_id: post.id, user_id: currentUser.id });

        if (error) throw error;

        await supabase
          .from("lcb_posts")
          .update({ likes_count: newCount })
          .eq("id", post.id);
      }
    } catch {
      setLiked(wasLiked);
      setLikesCount(prevCount);
      toast.error("Erreur lors de la mise a jour du like");
    } finally {
      setLikeLoading(false);
    }
  }, [liked, likesCount, likeLoading, post.id, currentUser.id, supabase]);

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Lien copie dans le presse-papier");
    } catch {
      toast.error("Impossible de copier le lien");
    }
  }, []);

  const TypeIcon = POST_TYPE_ICONS[post.type] ?? FileTextIcon;
  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: fr,
  });

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/feed">
          <ArrowLeftIcon className="size-4" />
          Retour au fil
        </Link>
      </Button>

      {/* Post card */}
      <Card className="gap-0 py-0 overflow-hidden">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start gap-3">
            <Link href={`/profile/${post.author.id}`}>
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
                  href={`/profile/${post.author.id}`}
                  className="font-semibold hover:underline"
                >
                  {post.author.full_name}
                </Link>
                {post.author.role !== "membre" && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] py-0",
                      ROLE_COLORS[post.author.role]
                    )}
                  >
                    {ROLES[post.author.role].label}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                <span>{timeAgo}</span>
                {post.is_pinned && (
                  <span className="flex items-center gap-0.5 text-amber-600">
                    <PinIcon className="size-3" />
                    Epingle
                  </span>
                )}
              </div>
            </div>

            <Badge
              variant="secondary"
              className={cn(
                "text-xs py-0.5 shrink-0",
                POST_TYPE_COLORS[post.type]
              )}
            >
              <TypeIcon className="size-3" />
              {POST_TYPES[post.type].label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="px-4 py-3 space-y-3">
          {post.title && (
            <h1 className="text-xl font-bold">{post.title}</h1>
          )}

          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {post.content}
          </div>

          {post.photos && post.photos.length > 0 && (
            <PhotoGallery photos={post.photos} size="large" maxVisible={6} />
          )}
        </CardContent>

        {/* Actions */}
        <div className="flex items-center gap-4 border-t px-4 py-2.5">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-1.5",
              liked ? "text-red-500" : "text-muted-foreground"
            )}
            onClick={toggleLike}
            disabled={likeLoading}
          >
            <HeartIcon className={cn("size-4", liked && "fill-current")} />
            <span>
              {likesCount > 0
                ? `${likesCount} J'aime`
                : "J'aime"}
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={handleShare}
          >
            <ShareIcon className="size-4" />
            Partager
          </Button>
        </div>
      </Card>

      {/* Comments */}
      <Card className="py-4">
        <CardContent>
          <CommentsSection postId={post.id} currentUser={currentUser} />
        </CardContent>
      </Card>
    </div>
  );
}
