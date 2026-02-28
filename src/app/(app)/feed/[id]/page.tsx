import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasMinRole } from "@/lib/constants";
import type { PostWithAuthor } from "@/lib/types";
import type { Post, Profile } from "@/lib/supabase/types";
import { PostDetail } from "@/components/feed/post-detail";

type PostWithAuthorRaw = Post & {
  author: Pick<Profile, "id" | "full_name" | "avatar_url" | "role"> | Pick<Profile, "id" | "full_name" | "avatar_url" | "role">[];
};

interface PostDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { id } = await params;
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

  // Fetch the post with author
  const { data: postRaw, error } = await supabase
    .from("lcb_posts")
    .select(
      "*, author:lcb_profiles!author_id(id, full_name, avatar_url, role)"
    )
    .eq("id", id)
    .single();

  if (error || !postRaw) {
    notFound();
  }

  const postData = postRaw as unknown as PostWithAuthorRaw;

  // Hidden posts only visible to CA/bureau
  if (postData.is_hidden && !hasMinRole(profile.role, "ca")) {
    notFound();
  }

  // Check if user has liked this post
  const { data: likeData } = await supabase
    .from("lcb_likes")
    .select("id")
    .eq("post_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const post: PostWithAuthor = {
    ...postData,
    author: Array.isArray(postData.author)
      ? postData.author[0]
      : postData.author,
    user_has_liked: !!likeData,
  };

  return <PostDetail post={post} currentUser={profile} />;
}
