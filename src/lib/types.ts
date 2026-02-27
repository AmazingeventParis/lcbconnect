import type { Post, Comment, Profile } from "@/lib/supabase/types";

export type PostWithAuthor = Post & {
  author: Pick<Profile, "id" | "full_name" | "avatar_url" | "role">;
  user_has_liked: boolean;
};

export type CommentWithAuthor = Comment & {
  author: Pick<Profile, "id" | "full_name" | "avatar_url" | "role">;
  replies?: CommentWithAuthor[];
};
