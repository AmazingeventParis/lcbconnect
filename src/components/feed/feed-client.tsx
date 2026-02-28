"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PlusIcon, NewspaperIcon } from "lucide-react";

import type { Profile, Post } from "@/lib/supabase/types";
import type { PostWithAuthor } from "@/lib/types";
import type { PostType } from "@/lib/constants";
import { useInfinitePosts } from "@/lib/hooks/use-infinite-posts";
import { useRealtime } from "@/lib/hooks/use-realtime";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PostCard } from "@/components/feed/post-card";
import { CreatePostDialog } from "@/components/feed/create-post-dialog";

interface FeedClientProps {
  profile: Profile;
  initialPosts: PostWithAuthor[];
}

const FILTER_TABS: { value: PostType | "all"; label: string }[] = [
  { value: "all", label: "Tout" },
  { value: "standard", label: "Général" },
  { value: "service", label: "Services" },
  { value: "officiel_bureau", label: "Officiel" },
];

export function FeedClient({ profile, initialPosts }: FeedClientProps) {
  const [filter, setFilter] = useState<PostType | "all">("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { posts, loading, hasMore, loadMore, refresh, setPosts } =
    useInfinitePosts({
      filter,
      currentUserId: profile.id,
      initialPosts,
    });

  // Realtime subscriptions
  useRealtime({
    onNewPost: useCallback(() => {
      refresh();
    }, [refresh]),
    onUpdatePost: useCallback(
      (updatedPost: Post) => {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === updatedPost.id
              ? { ...p, ...updatedPost, author: p.author }
              : p
          )
        );
      },
      [setPosts]
    ),
    onDeletePost: useCallback(
      (postId: string) => {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      },
      [setPosts]
    ),
  });

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, loadMore]);

  const handleLikeChange = useCallback(
    (postId: string, liked: boolean, newCount: number) => {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, user_has_liked: liked, likes_count: newCount }
            : p
        )
      );
    },
    [setPosts]
  );

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fil d&apos;actualités</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <PlusIcon className="size-4" />
          Créer une publication
        </Button>
      </div>

      {/* Filter tabs */}
      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as PostType | "all")}
      >
        <TabsList className="w-full" variant="line">
          {FILTER_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Posts list */}
      <div className="space-y-4">
        {posts.length === 0 && !loading ? (
          <div className="text-center py-16">
            <NewspaperIcon className="size-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">
              Aucune publication pour le moment
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Soyez le premier à publier quelque chose !
            </p>
            <Button
              className="mt-4"
              onClick={() => setShowCreateDialog(true)}
            >
              <PlusIcon className="size-4" />
              Créer une publication
            </Button>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={profile.id}
                onLikeChange={handleLikeChange}
              />
            ))}
          </>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-20 w-full" />
                <div className="flex gap-4">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="h-1" />

        {!hasMore && posts.length > 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            Vous avez tout vu !
          </p>
        )}
      </div>

      {/* Create post dialog */}
      <CreatePostDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        profile={profile}
        onPostCreated={refresh}
      />
    </div>
  );
}
