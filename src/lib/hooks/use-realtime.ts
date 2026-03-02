"use client";

import { useEffect, useMemo, useRef } from "react";
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
  const supabase = useMemo(() => createClient(), []);

  // Store callbacks in refs to avoid subscription churn
  const cbRef = useRef({ onNewPost, onUpdatePost, onDeletePost, onNewComment, onLikeChange });
  cbRef.current = { onNewPost, onUpdatePost, onDeletePost, onNewComment, onLikeChange };

  useEffect(() => {
    const channel = supabase
      .channel("feed-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lcb_posts" },
        (payload) => {
          cbRef.current.onNewPost?.(payload.new as Post);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lcb_posts" },
        (payload) => {
          cbRef.current.onUpdatePost?.(payload.new as Post);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "lcb_posts" },
        (payload) => {
          cbRef.current.onDeletePost?.(payload.old.id as string);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lcb_comments" },
        (payload) => {
          cbRef.current.onNewComment?.(payload.new as Comment);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lcb_likes" },
        (payload) => {
          cbRef.current.onLikeChange?.(payload.new as Like, "INSERT");
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "lcb_likes" },
        (payload) => {
          cbRef.current.onLikeChange?.(payload.old as Like, "DELETE");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);
}
