"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale/fr";
import {
  SendIcon,
  Loader2Icon,
  CornerDownRightIcon,
  MessageCircleIcon,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { commentSchema, type CommentValues } from "@/lib/validators";
import { ROLES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { CommentWithAuthor } from "@/lib/types";
import type { Profile } from "@/lib/supabase/types";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface CommentsSectionProps {
  postId: string;
  currentUser: Profile;
}

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

function buildCommentTree(
  comments: CommentWithAuthor[]
): CommentWithAuthor[] {
  const map = new Map<string, CommentWithAuthor>();
  const roots: CommentWithAuthor[] = [];

  // First pass: index all comments
  comments.forEach((c) => {
    map.set(c.id, { ...c, replies: [] });
  });

  // Second pass: build tree
  comments.forEach((c) => {
    const comment = map.get(c.id)!;
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.replies!.push(comment);
    } else {
      roots.push(comment);
    }
  });

  return roots;
}

interface CommentItemProps {
  comment: CommentWithAuthor;
  postId: string;
  currentUser: Profile;
  depth: number;
  onCommentAdded: () => void;
}

function CommentItem({
  comment,
  postId,
  currentUser,
  depth,
  onCommentAdded,
}: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  const replyForm = useForm<CommentValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: "" },
  });

  const handleReply = useCallback(
    async (values: CommentValues) => {
      setSubmitting(true);
      try {
        const { error } = await supabase.from("lcb_comments").insert({
          post_id: postId,
          author_id: currentUser.id,
          parent_id: comment.id,
          content: values.content,
        });

        if (error) throw error;

        // Update comments count on post
        const { data: post } = await supabase
          .from("lcb_posts")
          .select("comments_count")
          .eq("id", postId)
          .single();

        if (post) {
          await supabase
            .from("lcb_posts")
            .update({ comments_count: post.comments_count + 1 })
            .eq("id", postId);
        }

        replyForm.reset();
        setShowReplyForm(false);
        onCommentAdded();
        toast.success("Réponse ajoutée");
      } catch {
        toast.error("Erreur lors de l'ajout de la réponse");
      } finally {
        setSubmitting(false);
      }
    },
    [supabase, postId, currentUser.id, comment.id, replyForm, onCommentAdded]
  );

  const timeAgo = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: true,
    locale: fr,
  });

  return (
    <div className={cn("space-y-2", depth > 0 && "ml-6 pl-4 border-l-2 border-muted")}>
      <div className="flex gap-2.5">
        <Avatar size={depth > 0 ? "sm" : "default"}>
          {comment.author.avatar_url && (
            <AvatarImage
              src={comment.author.avatar_url}
              alt={comment.author.full_name}
            />
          )}
          <AvatarFallback>
            {getInitials(comment.author.full_name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="bg-muted/50 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-sm">
                {comment.author.full_name}
              </span>
              {comment.author.role !== "membre" && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] py-0",
                    ROLE_COLORS[comment.author.role]
                  )}
                >
                  {ROLES[comment.author.role].label}
                </Badge>
              )}
            </div>
            <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
          </div>

          <div className="flex items-center gap-3 mt-1 px-1">
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
            {depth < 2 && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground font-medium"
                onClick={() => setShowReplyForm(!showReplyForm)}
              >
                Répondre
              </button>
            )}
          </div>

          {showReplyForm && (
            <form
              onSubmit={replyForm.handleSubmit(handleReply)}
              className="flex items-start gap-2 mt-2"
            >
              <div className="flex-1">
                <Textarea
                  placeholder={`Répondre à ${comment.author.full_name}...`}
                  className="min-h-[60px] text-sm"
                  {...replyForm.register("content")}
                />
                {replyForm.formState.errors.content && (
                  <p className="text-destructive text-xs mt-1">
                    {replyForm.formState.errors.content.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                size="icon-sm"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SendIcon className="size-4" />
                )}
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3 mt-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              currentUser={currentUser}
              depth={depth + 1}
              onCommentAdded={onCommentAdded}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentsSection({ postId, currentUser }: CommentsSectionProps) {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  const form = useForm<CommentValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: "" },
  });

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lcb_comments")
        .select(
          "*, author:lcb_profiles!author_id(id, full_name, avatar_url, role)"
        )
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching comments:", error);
        return;
      }

      const mapped: CommentWithAuthor[] = (data ?? []).map((c) => ({
        ...c,
        author: Array.isArray(c.author) ? c.author[0] : c.author,
      }));

      setComments(mapped);
    } finally {
      setLoading(false);
    }
  }, [supabase, postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Real-time comments subscription
  useEffect(() => {
    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "lcb_comments",
          filter: `post_id=eq.${postId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, postId, fetchComments]);

  const handleSubmit = useCallback(
    async (values: CommentValues) => {
      setSubmitting(true);
      try {
        const { error } = await supabase.from("lcb_comments").insert({
          post_id: postId,
          author_id: currentUser.id,
          content: values.content,
        });

        if (error) throw error;

        // Update comments count on post
        const { data: post } = await supabase
          .from("lcb_posts")
          .select("comments_count")
          .eq("id", postId)
          .single();

        if (post) {
          await supabase
            .from("lcb_posts")
            .update({ comments_count: post.comments_count + 1 })
            .eq("id", postId);
        }

        form.reset();
        fetchComments();
        toast.success("Commentaire ajouté");
      } catch {
        toast.error("Erreur lors de l'ajout du commentaire");
      } finally {
        setSubmitting(false);
      }
    },
    [supabase, postId, currentUser.id, form, fetchComments]
  );

  const commentTree = buildCommentTree(comments);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircleIcon className="size-5 text-muted-foreground" />
        <h3 className="font-semibold text-lg">
          Commentaires ({comments.length})
        </h3>
      </div>

      <Separator />

      {/* Comment form */}
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex items-start gap-3"
      >
        <Avatar>
          {currentUser.avatar_url && (
            <AvatarImage
              src={currentUser.avatar_url}
              alt={currentUser.full_name}
            />
          )}
          <AvatarFallback>
            {getInitials(currentUser.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <Textarea
            placeholder="Écrire un commentaire..."
            className="min-h-[80px]"
            {...form.register("content")}
          />
          {form.formState.errors.content && (
            <p className="text-destructive text-xs">
              {form.formState.errors.content.message}
            </p>
          )}
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <SendIcon className="size-4" />
                  Commenter
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      <Separator />

      {/* Comments list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : commentTree.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CornerDownRightIcon className="size-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucun commentaire pour le moment</p>
          <p className="text-xs">Soyez le premier à commenter</p>
        </div>
      ) : (
        <div className="space-y-4">
          {commentTree.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              currentUser={currentUser}
              depth={0}
              onCommentAdded={fetchComments}
            />
          ))}
        </div>
      )}
    </div>
  );
}
