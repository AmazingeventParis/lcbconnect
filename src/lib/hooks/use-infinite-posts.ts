"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PostWithAuthor } from "@/lib/types";
import type { Post, Profile } from "@/lib/supabase/types";
import type { PostType } from "@/lib/constants";

const PAGE_SIZE = 10;

type PostWithAuthorRaw = Post & {
  author:
    | Pick<Profile, "id" | "full_name" | "avatar_url" | "role">
    | Pick<Profile, "id" | "full_name" | "avatar_url" | "role">[];
};

interface UseInfinitePostsOptions {
  filter?: PostType | "all";
  currentUserId: string;
  initialPosts?: PostWithAuthor[];
}

export function useInfinitePosts({
  filter = "all",
  currentUserId,
  initialPosts = [],
}: UseInfinitePostsOptions) {
  const [posts, setPosts] = useState<PostWithAuthor[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const cursorRef = useRef<string | null>(null);
  const supabase = createClient();

  const fetchPosts = useCallback(
    async (cursor?: string | null) => {
      setLoading(true);
      try {
        let query = supabase
          .from("lcb_posts")
          .select(
            "*, author:lcb_profiles!author_id(id, full_name, avatar_url, role)"
          )
          .eq("is_hidden", false)
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE);

        if (filter !== "all") {
          query = query.eq("type", filter);
        }

        if (cursor) {
          query = query.lt("created_at", cursor);
        }

        const { data: rawData, error } = await query;

        if (error) {
          console.error("Error fetching posts:", error);
          return;
        }

        const data = (rawData ?? []) as unknown as PostWithAuthorRaw[];

        if (data.length === 0) {
          setHasMore(false);
          if (!cursor) setPosts([]);
          return;
        }

        // Fetch likes for the current user for these posts
        const postIds = data.map((p) => p.id);
        const { data: likesRaw } = await supabase
          .from("lcb_likes")
          .select("post_id")
          .eq("user_id", currentUserId)
          .in("post_id", postIds);

        const likedPostIds = new Set(
          (likesRaw ?? []).map((l) => l.post_id)
        );

        const postsWithAuthor: PostWithAuthor[] = data.map((post) => ({
          ...post,
          author: Array.isArray(post.author) ? post.author[0] : post.author,
          user_has_liked: likedPostIds.has(post.id),
        }));

        if (cursor) {
          setPosts((prev) => [...prev, ...postsWithAuthor]);
        } else {
          setPosts(postsWithAuthor);
        }

        if (data.length < PAGE_SIZE) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }

        cursorRef.current = data[data.length - 1].created_at;
      } finally {
        setLoading(false);
      }
    },
    [supabase, filter, currentUserId]
  );

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    fetchPosts(cursorRef.current);
  }, [fetchPosts, loading, hasMore]);

  const refresh = useCallback(() => {
    cursorRef.current = null;
    setHasMore(true);
    fetchPosts(null);
  }, [fetchPosts]);

  // Fetch on filter change (but skip if we have initialPosts and it's the first load with "all" filter)
  useEffect(() => {
    if (initialLoad && filter === "all" && initialPosts.length > 0) {
      setInitialLoad(false);
      if (initialPosts.length < PAGE_SIZE) {
        setHasMore(false);
      }
      if (initialPosts.length > 0) {
        cursorRef.current = initialPosts[initialPosts.length - 1].created_at;
      }
      return;
    }
    setInitialLoad(false);
    cursorRef.current = null;
    setHasMore(true);
    fetchPosts(null);
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  return { posts, loading, hasMore, loadMore, refresh, setPosts };
}
