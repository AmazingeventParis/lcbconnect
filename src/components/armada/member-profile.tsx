"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Ship,
  MapPin,
  Mail,
  Phone,
  MessageSquare,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ROLES } from "@/lib/constants";
import type { Profile } from "@/lib/supabase/types";
import type { PostWithAuthor } from "@/lib/types";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PostCard } from "@/components/feed/post-card";

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

interface MemberProfileProps {
  profile: Profile;
  currentUserId: string;
}

export function MemberProfile({ profile, currentUserId }: MemberProfileProps) {
  const supabase = createClient();
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoadingPosts(true);

    const { data: postsData } = await supabase
      .from("lcb_posts")
      .select("*, author:lcb_profiles!lcb_posts_author_id_fkey(id, full_name, avatar_url, role)")
      .eq("author_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (postsData) {
      // Check which posts current user has liked
      const postIds = postsData.map((p) => p.id);
      const { data: likes } = await supabase
        .from("lcb_likes")
        .select("post_id")
        .eq("user_id", currentUserId)
        .in("post_id", postIds);

      const likedPostIds = new Set(likes?.map((l) => l.post_id) ?? []);

      setPosts(
        postsData.map((p) => ({
          ...p,
          author: Array.isArray(p.author) ? p.author[0] : p.author,
          user_has_liked: likedPostIds.has(p.id),
        })) as PostWithAuthor[]
      );
    }

    setLoadingPosts(false);
  }, [supabase, profile.id, currentUserId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleLikeChange = (postId: string, liked: boolean, newCount: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, user_has_liked: liked, likes_count: newCount }
          : p
      )
    );
  };

  const isOwnProfile = profile.id === currentUserId;

  return (
    <div className="mx-auto max-w-2xl p-6">
      {/* Back link */}
      <Link
        href="/armada"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Retour à l&apos;armada
      </Link>

      {/* Profile header */}
      <Card className="gap-0 py-0 overflow-hidden mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <Avatar className="size-20">
              {profile.avatar_url && (
                <AvatarImage
                  src={profile.avatar_url}
                  alt={profile.full_name}
                />
              )}
              <AvatarFallback className="bg-[#1E3A5F]/10 text-[#1E3A5F] text-xl">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold">{profile.full_name}</h1>
                <Badge
                  variant="secondary"
                  className={cn("text-xs", ROLE_COLORS[profile.role])}
                >
                  {ROLES[profile.role].label}
                </Badge>
              </div>

              {profile.bio && (
                <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                  {profile.bio}
                </p>
              )}

              {/* Boat info */}
              <div className="mt-3 space-y-1">
                {profile.boat_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Ship className="size-4 text-muted-foreground shrink-0" />
                    <span>
                      {profile.boat_name}
                      {profile.boat_type && (
                        <span className="text-muted-foreground">
                          {" "}
                          &middot; {profile.boat_type}
                        </span>
                      )}
                    </span>
                  </div>
                )}
                {profile.mooring_port && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="size-4 text-muted-foreground shrink-0" />
                    <span>{profile.mooring_port}</span>
                  </div>
                )}
              </div>

              {/* Contact info */}
              <div className="mt-3 space-y-1">
                {profile.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="size-4 text-muted-foreground shrink-0" />
                    <a
                      href={`mailto:${profile.email}`}
                      className="text-[#1E3A5F] hover:underline"
                    >
                      {profile.email}
                    </a>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="size-4 text-muted-foreground shrink-0" />
                    <a
                      href={`tel:${profile.phone}`}
                      className="text-[#1E3A5F] hover:underline"
                    >
                      {profile.phone}
                    </a>
                  </div>
                )}
              </div>

              {/* Message button */}
              {!isOwnProfile && (
                <Button asChild className="mt-4" size="sm">
                  <Link href="/messages">
                    <MessageSquare className="size-4" />
                    Envoyer un message
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          Publications
          {!loadingPosts && (
            <span className="text-muted-foreground font-normal text-sm ml-2">
              ({posts.length})
            </span>
          )}
        </h2>

        {loadingPosts ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <Card className="gap-0 py-0">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                Aucune publication pour le moment.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                onLikeChange={handleLikeChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
