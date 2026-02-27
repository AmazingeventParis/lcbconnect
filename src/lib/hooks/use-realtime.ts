"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Post, Comment, Like } from "@/lib/supabase/types";

interface UseRealtimeOptions {
  onNewPost?: (post: Post) => void;
  onUpdatePost?: (post: Post) => void;
  onDeletePost?: (postId: string) => void;
  onNewComment?: (comment: Comment) => void;
  onLikeChange?: (like: Like, eventType: "INSERT" | "DELETE") => void;
}

export function useRealtime({
  onNewPost,
  onUpdatePost,
  onDeletePost,
  onNewComment,
  onLikeChange,
}: UseRealtimeOptions) {
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel("feed-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lcb_posts" },
        (payload) => {
          onNewPost?.(payload.new as Post);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lcb_posts" },
        (payload) => {
          onUpdatePost?.(payload.new as Post);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "lcb_posts" },
        (payload) => {
          onDeletePost?.(payload.old.id as string);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lcb_comments" },
        (payload) => {
          onNewComment?.(payload.new as Comment);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lcb_likes" },
        (payload) => {
          onLikeChange?.(payload.new as Like, "INSERT");
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "lcb_likes" },
        (payload) => {
          onLikeChange?.(payload.old as Like, "DELETE");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, onNewPost, onUpdatePost, onDeletePost, onNewComment, onLikeChange]);
}
