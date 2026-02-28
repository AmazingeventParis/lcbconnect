"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { sendNotification } from "@/lib/notify";
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
  MessageSquare,
  ImagePlus,
  X,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hasMinRole, type Role } from "@/lib/constants";
import { GroupSettingsDialog } from "./group-settings-dialog";
import type { Profile, Message, Conversation } from "@/lib/supabase/types";

interface ChatViewProps {
  conversationId: string;
  currentUserId: string;
  onBack: () => void;
}

interface MessageWithSender extends Message {
  sender: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
}

type MemberSuggestion = Pick<Profile, "id" | "full_name" | "avatar_url">;

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
    case "channel":
      return <MessageSquare className="size-4" />;
    case "channel_ca":
      return <Shield className="size-4" />;
    default:
      return <Users className="size-4" />;
  }
}

async function compressImage(file: File, maxWidth = 1200, quality = 0.7): Promise<Blob> {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    const canvas = document.createElement("canvas");
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => resolve(blob ?? file),
          "image/jpeg",
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ChatView({
  conversationId,
  currentUserId,
  onBack,
}: ChatViewProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [otherMembers, setOtherMembers] = useState<MemberSuggestion[]>([]);
  const [allMembers, setAllMembers] = useState<MemberSuggestion[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(0);
  const mentionRef = useRef<HTMLDivElement>(null);
  const [mentionedUsers, setMentionedUsers] = useState<Map<string, string>>(new Map());

  // User role state
  const [currentUserRole, setCurrentUserRole] = useState<Role>("membre");
  const [showGroupSettings, setShowGroupSettings] = useState(false);

  // Image attachment state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Filter members for mention autocomplete
  const mentionSuggestions =
    mentionQuery !== null
      ? allMembers.filter((m) =>
          m.full_name.toLowerCase().includes(mentionQuery.toLowerCase())
        ).slice(0, 5)
      : [];

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

      // Fetch current user role
      const { data: myProfile } = await (supabase as any)
        .from("lcb_profiles")
        .select("role")
        .eq("id", currentUserId)
        .single();

      if (!cancelled && myProfile) {
        setCurrentUserRole(myProfile.role as Role);
      }

      // Fetch members with profiles
      const { data: membersData } = await (supabase as any)
        .from("lcb_conversation_members")
        .select("user_id")
        .eq("conversation_id", conversationId);

      if (cancelled) return;

      const allMemberIds = (membersData ?? []).map((m: any) => m.user_id) as string[];
      const otherIds = allMemberIds.filter((id) => id !== currentUserId);

      if (allMemberIds.length > 0) {
        const { data: profiles } = await (supabase as any)
          .from("lcb_profiles")
          .select("id, full_name, avatar_url")
          .in("id", allMemberIds);

        if (!cancelled && profiles) {
          setAllMembers(profiles);
          setOtherMembers(profiles.filter((p: MemberSuggestion) => p.id !== currentUserId));
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
      const senderProfiles: Record<
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

  // Extract mentioned user IDs from message content (format: @[Name](userId))
  function extractMentionedUserIds(content: string): string[] {
    const regex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const ids: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      ids.push(match[2]);
    }
    return ids;
  }

  // Upload image to Supabase Storage
  async function uploadImage(file: File): Promise<string | null> {
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const ext = "jpg";
      const fileName = `${currentUserId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error } = await supabase.storage
        .from("lcb-attachments")
        .upload(fileName, compressed, {
          cacheControl: "3600",
          upsert: false,
          contentType: "image/jpeg",
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("lcb-attachments")
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Erreur lors de l'envoi de l'image");
      return null;
    } finally {
      setUploading(false);
    }
  }

  // Handle image selection
  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Seules les images sont acceptées");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 10 Mo");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Send message
  const handleSend = async () => {
    const rawContent = inputValue.trim();
    if ((!rawContent && !imageFile) || sending) return;

    // Convert @Name to @[Name](id) before sending
    const content = rawContent ? buildMentionContent(rawContent) : "";

    setSending(true);
    setInputValue("");
    setMentionedUsers(new Map());

    try {
      let attachments: string[] = [];

      // Upload image if present
      if (imageFile) {
        const url = await uploadImage(imageFile);
        if (url) attachments = [url];
        clearImage();
      }

      const messageContent = content || (attachments.length > 0 ? "📷 Photo" : "");
      if (!messageContent) return;

      const { error } = await (supabase as any)
        .from("lcb_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: messageContent,
          attachments,
        });

      if (error) throw error;

      // Update conversation updated_at
      await (supabase as any)
        .from("lcb_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      sendNotification({
        type: "message",
        actorId: currentUserId,
        targetType: "conversation",
        targetId: conversationId,
      });

      // Send mention notifications
      const mentionedIds = extractMentionedUserIds(messageContent);
      if (mentionedIds.length > 0) {
        sendNotification({
          type: "mention",
          actorId: currentUserId,
          targetType: "message",
          targetId: conversationId,
          data: { mentionedUserIds: mentionedIds.join(",") },
        });
      }

      setTimeout(() => scrollToBottom(), 100);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'envoi du message");
      setInputValue(rawContent); // Restore content on error
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // Handle text input change with mention detection
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setInputValue(value);

    // Auto-resize textarea
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;

    // Detect @mention
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);

    // Find the last @ that starts a mention (not inside an existing mention link)
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionStart(cursorPos - atMatch[0].length);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  }

  // Insert mention — show only @Name in textarea, store mapping for send
  function insertMention(member: MemberSuggestion) {
    const before = inputValue.slice(0, mentionStart);
    const after = inputValue.slice(
      inputRef.current?.selectionStart ?? mentionStart
    );
    const mentionText = `@${member.full_name} `;
    const newValue = before + mentionText + after;
    setInputValue(newValue);
    setMentionQuery(null);
    setMentionedUsers((prev) => new Map(prev).set(member.full_name, member.id));

    // Focus and set cursor position after the mention
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const pos = before.length + mentionText.length;
        inputRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  }

  // Reconstruct content with @[Name](id) format for storage
  function buildMentionContent(content: string): string {
    let result = content;
    // Sort by name length descending to avoid partial replacements
    const entries = [...mentionedUsers.entries()].sort(
      (a, b) => b[0].length - a[0].length
    );
    for (const [name, id] of entries) {
      result = result.replaceAll(`@${name}`, `@[${name}](${id})`);
    }
    return result;
  }

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If mention suggestions are visible, handle arrow keys and enter
    if (mentionQuery !== null && mentionSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((prev) =>
          prev < mentionSuggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((prev) =>
          prev > 0 ? prev - 1 : mentionSuggestions.length - 1
        );
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        insertMention(mentionSuggestions[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

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
          conversation.avatar_url ? (
            <Avatar className="size-10 shrink-0">
              <AvatarImage src={conversation.avatar_url} alt={displayName} />
              <AvatarFallback className="text-[#1E3A5F] bg-[#1E3A5F]/10">
                {getGroupIcon(conversation.group_type)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="flex items-center justify-center size-10 rounded-full bg-[#1E3A5F]/10 text-[#1E3A5F] shrink-0">
              {getGroupIcon(conversation.group_type)}
            </div>
          )
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

        {conversation?.is_group && hasMinRole(currentUserRole, "bureau") && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => setShowGroupSettings(true)}
          >
            <Pencil className="size-4" />
          </Button>
        )}
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
                    attachments={msg.attachments}
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
        {/* Image preview */}
        {imagePreview && (
          <div className="mb-2 relative inline-block">
            <Image
              src={imagePreview}
              alt="Aperçu"
              width={120}
              height={120}
              className="rounded-lg object-cover border"
              style={{ width: 120, height: 120 }}
            />
            <button
              onClick={clearImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* Mention suggestions dropdown */}
        {mentionQuery !== null && mentionSuggestions.length > 0 && (
          <div
            ref={mentionRef}
            className="mb-2 bg-white border rounded-xl shadow-lg overflow-hidden max-h-[200px] overflow-y-auto"
          >
            {mentionSuggestions.map((member, i) => (
              <button
                key={member.id}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors",
                  i === mentionIndex && "bg-slate-100"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(member);
                }}
              >
                <Avatar className="size-6">
                  {member.avatar_url && (
                    <AvatarImage src={member.avatar_url} alt={member.full_name} />
                  )}
                  <AvatarFallback className="text-[10px]">
                    {getInitials(member.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{member.full_name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Image button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full size-10 shrink-0 text-muted-foreground hover:text-[#1E3A5F]"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || uploading}
          >
            <ImagePlus className="size-5" />
          </Button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Écrivez un message... (@nom pour mentionner)"
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
            disabled={(!inputValue.trim() && !imageFile) || sending || uploading}
            onClick={handleSend}
          >
            {sending || uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Group settings dialog */}
      {conversation?.is_group && (
        <GroupSettingsDialog
          conversation={conversation}
          open={showGroupSettings}
          onOpenChange={setShowGroupSettings}
          onUpdated={(updated) => {
            setConversation((prev) => prev ? { ...prev, ...updated } : prev);
          }}
        />
      )}
    </div>
  );
}
