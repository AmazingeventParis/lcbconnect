import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PostWithAuthor } from "@/lib/types";
import type { Post, Profile } from "@/lib/supabase/types";
import { FeedClient } from "@/components/feed/feed-client";

type PostWithAuthorRaw = Post & {
  author: Pick<Profile, "id" | "full_name" | "avatar_url" | "role"> | Pick<Profile, "id" | "full_name" | "avatar_url" | "role">[];
};

export default async function FeedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("lcb_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  // Fetch initial posts server-side (exclude hidden)
  const { data: postsRaw } = await supabase
    .from("lcb_posts")
    .select(
      "*, author:lcb_profiles!author_id(id, full_name, avatar_url, role)"
    )
    .eq("is_hidden", false)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(10);

  const postsData = (postsRaw ?? []) as unknown as PostWithAuthorRaw[];

  // Fetch user likes for these initial posts
  const postIds = postsData.map((p) => p.id);
  const { data: likes } = postIds.length > 0
    ? await supabase
        .from("lcb_likes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds)
    : { data: [] as { post_id: string }[] };

  const likedPostIds = new Set((likes ?? []).map((l) => l.post_id));

  const initialPosts: PostWithAuthor[] = postsData.map((post) => ({
    ...post,
    author: Array.isArray(post.author) ? post.author[0] : post.author,
    user_has_liked: likedPostIds.has(post.id),
  }));

  return <FeedClient profile={profile} initialPosts={initialPosts} />;
}
