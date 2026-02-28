"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageBubble } from "./message-bubble";
import {
  ArrowLeft,
  Send,
  Loader2,
  Users,
  Shield,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile, Message, Conversation } from "@/lib/supabase/types";

interface ChatViewProps {
  conversationId: string;
  currentUserId: string;
  onBack: () => void;
}

interface MessageWithSender extends Message {
  sender: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getGroupIcon(groupType: string | null) {
  switch (groupType) {
    case "ca":
      return <Shield className="size-4" />;
    case "bureau":
      return <Landmark className="size-4" />;
    default:
      return <Users className="size-4" />;
  }
}

export function ChatView({
  conversationId,
  currentUserId,
  onBack,
}: ChatViewProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [otherMembers, setOtherMembers] = useState<
    Pick<Profile, "id" | "full_name" | "avatar_url">[]
  >([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Load conversation details and members
  useEffect(() => {
    let cancelled = false;

    async function loadConversation() {
      setLoading(true);

      // Fetch conversation
      const { data: conv } = await (supabase as any)
        .from("lcb_conversations")
        .select("*")
        .eq("id", conversationId)
        .single();

      if (cancelled) return;
      setConversation(conv);

      // Fetch members with profiles
      const { data: membersData } = await (supabase as any)
        .from("lcb_conversation_members")
        .select("user_id")
        .eq("conversation_id", conversationId);

      if (cancelled) return;

      const memberIds = (membersData ?? [])
        .map((m: any) => m.user_id)
        .filter((id: string) => id !== currentUserId);

      if (memberIds.length > 0) {
        const { data: profiles } = await (supabase as any)
          .from("lcb_profiles")
          .select("id, full_name, avatar_url")
          .in("id", memberIds);

        if (!cancelled) {
          setOtherMembers(profiles ?? []);
        }
      }

      // Fetch messages
      const { data: msgs } = await (supabase as any)
        .from("lcb_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (cancelled) return;

      // Gather unique sender IDs
      const senderIds = [
        ...new Set((msgs ?? []).map((m: any) => m.sender_id)),
      ] as string[];
      let senderProfiles: Record<
        string,
        Pick<Profile, "id" | "full_name" | "avatar_url">
      > = {};

      if (senderIds.length > 0) {
        const { data: profiles } = await (supabase as any)
          .from("lcb_profiles")
          .select("id, full_name, avatar_url")
          .in("id", senderIds);

        if (!cancelled) {
          (profiles ?? []).forEach((p: any) => {
            senderProfiles[p.id] = p;
          });
        }
      }

      if (cancelled) return;

      const messagesWithSenders: MessageWithSender[] = (msgs ?? []).map(
        (msg: Message) => ({
          ...msg,
          sender: senderProfiles[msg.sender_id] ?? null,
        })
      );

      setMessages(messagesWithSenders);
      setLoading(false);

      // Update last_read_at
      await (supabase as any)
        .from("lcb_conversation_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", currentUserId);

      // Scroll to bottom after messages load
      setTimeout(() => scrollToBottom("instant"), 50);
    }

    loadConversation();
    return () => {
      cancelled = true;
    };
  }, [supabase, conversationId, currentUserId, scrollToBottom]);

  // Realtime subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "lcb_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload: any) => {
          const newMsg = payload.new as Message;

          // Don't duplicate if we already added it optimistically
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;

            // Fetch sender profile
            const existingSender = prev.find(
              (m) => m.sender_id === newMsg.sender_id
            )?.sender;

            return [
              ...prev,
              { ...newMsg, sender: existingSender ?? null },
            ];
          });

          // If the message is from someone else, load their profile if needed
          if (newMsg.sender_id !== currentUserId) {
            const { data: profile } = await (supabase as any)
              .from("lcb_profiles")
              .select("id, full_name, avatar_url")
              .eq("id", newMsg.sender_id)
              .single();

            if (profile) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === newMsg.id ? { ...m, sender: profile } : m
                )
              );
            }
          }

          // Update last_read_at
          await (supabase as any)
            .from("lcb_conversation_members")
            .update({ last_read_at: new Date().toISOString() })
            .eq("conversation_id", conversationId)
            .eq("user_id", currentUserId);

          setTimeout(() => scrollToBottom(), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, conversationId, currentUserId, scrollToBottom]);

  // Send message
  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || sending) return;

    setSending(true);
    setInputValue("");

    try {
      const { error } = await (supabase as any)
        .from("lcb_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content,
        });

      if (error) throw error;

      // Update conversation updated_at
      await (supabase as any)
        .from("lcb_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      setTimeout(() => scrollToBottom(), 100);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'envoi du message");
      setInputValue(content); // Restore content on error
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Build display name
  const displayName = conversation?.is_group
    ? conversation.name || "Groupe"
    : otherMembers[0]?.full_name || "Conversation";

  const displayAvatar = !conversation?.is_group
    ? otherMembers[0]?.avatar_url
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-white shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden -ml-2"
          onClick={onBack}
        >
          <ArrowLeft className="size-5" />
        </Button>

        {conversation?.is_group ? (
          <div className="flex items-center justify-center size-10 rounded-full bg-[#1E3A5F]/10 text-[#1E3A5F] shrink-0">
            {getGroupIcon(conversation.group_type)}
          </div>
        ) : (
          <Avatar className="size-10">
            {displayAvatar && (
              <AvatarImage src={displayAvatar} alt={displayName} />
            )}
            <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
          </Avatar>
        )}

        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-sm truncate">{displayName}</h2>
          {conversation?.is_group && (
            <p className="text-xs text-muted-foreground truncate">
              {otherMembers.length + 1} membres
            </p>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto py-4 space-y-0"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
            <p>Aucun message pour le moment</p>
            <p className="text-xs mt-1">Envoyez le premier message !</p>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const nextMsg =
                index < messages.length - 1 ? messages[index + 1] : null;

              const isOwn = msg.sender_id === currentUserId;
              const isSameSenderAsPrev =
                prevMsg?.sender_id === msg.sender_id;
              const isSameSenderAsNext =
                nextMsg?.sender_id === msg.sender_id;

              // Check if time gap > 5 minutes from previous message
              const timeGap = prevMsg
                ? new Date(msg.created_at).getTime() -
                  new Date(prevMsg.created_at).getTime()
                : Infinity;
              const isNewGroup = timeGap > 5 * 60 * 1000;

              // Show avatar on the last message of a consecutive group
              const showAvatar = !isSameSenderAsNext || isNewGroup;
              // Show name on the first message of a consecutive group
              const showName =
                conversation?.is_group === true &&
                (!isSameSenderAsPrev || isNewGroup);

              // Date separator
              const showDateSeparator =
                index === 0 ||
                new Date(msg.created_at).toDateString() !==
                  new Date(messages[index - 1].created_at).toDateString();

              return (
                <div key={msg.id}>
                  {showDateSeparator && (
                    <div className="flex items-center justify-center my-4">
                      <span className="text-xs text-muted-foreground bg-white px-3 py-1 rounded-full border">
                        {new Date(msg.created_at).toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </span>
                    </div>
                  )}
                  {isNewGroup && !showDateSeparator && (
                    <div className="h-3" />
                  )}
                  <MessageBubble
                    content={msg.content}
                    createdAt={msg.created_at}
                    sender={msg.sender}
                    isOwn={isOwn}
                    showAvatar={showAvatar}
                    showName={showName}
                  />
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="border-t bg-white p-3 shrink-0">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                // Auto-resize textarea
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ecrivez un message..."
              className={cn(
                "w-full resize-none rounded-2xl border bg-gray-50 px-4 py-2.5 text-sm",
                "focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent",
                "placeholder:text-muted-foreground",
                "min-h-[40px] max-h-[120px]"
              )}
              rows={1}
            />
          </div>
          <Button
            size="sm"
            className="rounded-full size-10 shrink-0"
            disabled={!inputValue.trim() || sending}
            onClick={handleSend}
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
