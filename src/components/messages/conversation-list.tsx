"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, Shield, Landmark, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile, Conversation, Message } from "@/lib/supabase/types";

interface ConversationListItem {
  conversation: Conversation;
  otherMembers: Pick<Profile, "id" | "full_name" | "avatar_url">[];
  lastMessage: Message | null;
  lastReadAt: string | null;
  memberCount: number;
}

interface ConversationListProps {
  currentUserId: string;
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  refreshTrigger: number;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return "maintenant";
  if (diffMin < 60) return `${diffMin} min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}j`;

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function getGroupIcon(groupType: string | null) {
  switch (groupType) {
    case "ca":
      return <Shield className="size-3.5" />;
    case "bureau":
      return <Landmark className="size-3.5" />;
    case "channel":
      return <Hash className="size-3.5" />;
    case "channel_ca":
      return <Shield className="size-3.5" />;
    default:
      return <Users className="size-3.5" />;
  }
}

export function ConversationList({
  currentUserId,
  selectedConversationId,
  onSelectConversation,
  refreshTrigger,
}: ConversationListProps) {
  const supabase = createClient();
  const [conversations, setConversations] = useState<ConversationListItem[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchConversations = useCallback(async () => {
    try {
      // 1. Get all conversation IDs where current user is a member
      const { data: memberships, error: memberError } = await (supabase as any)
        .from("lcb_conversation_members")
        .select("conversation_id, last_read_at")
        .eq("user_id", currentUserId);

      if (memberError) throw memberError;
      if (!memberships || memberships.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const convIds = memberships.map((m: any) => m.conversation_id);
      const lastReadMap: Record<string, string | null> = {};
      memberships.forEach((m: any) => {
        lastReadMap[m.conversation_id] = m.last_read_at;
      });

      // 2. Fetch conversations
      const { data: convs, error: convError } = await (supabase as any)
        .from("lcb_conversations")
        .select("*")
        .in("id", convIds)
        .order("updated_at", { ascending: false });

      if (convError) throw convError;

      // 3. Fetch all members for these conversations (with profiles)
      const { data: allMembers, error: allMemberError } = await (
        supabase as any
      )
        .from("lcb_conversation_members")
        .select("conversation_id, user_id")
        .in("conversation_id", convIds);

      if (allMemberError) throw allMemberError;

      // Group members by conversation
      const membersByConv: Record<string, string[]> = {};
      (allMembers ?? []).forEach((m: any) => {
        if (!membersByConv[m.conversation_id])
          membersByConv[m.conversation_id] = [];
        membersByConv[m.conversation_id].push(m.user_id);
      });

      // 4. Fetch profiles for other members
      const otherUserIds = [
        ...new Set(
          (allMembers ?? [])
            .map((m: any) => m.user_id)
            .filter((id: string) => id !== currentUserId)
        ),
      ] as string[];

      let profilesMap: Record<
        string,
        Pick<Profile, "id" | "full_name" | "avatar_url">
      > = {};
      if (otherUserIds.length > 0) {
        const { data: profiles } = await (supabase as any)
          .from("lcb_profiles")
          .select("id, full_name, avatar_url")
          .in("id", otherUserIds);

        (profiles ?? []).forEach((p: any) => {
          profilesMap[p.id] = p;
        });
      }

      // 5. Fetch last message for each conversation
      // We fetch recent messages sorted descending and pick the first per conversation
      const { data: recentMessages } = await (supabase as any)
        .from("lcb_messages")
        .select("*")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false });

      const lastMessageMap: Record<string, Message> = {};
      (recentMessages ?? []).forEach((msg: Message) => {
        if (!lastMessageMap[msg.conversation_id]) {
          lastMessageMap[msg.conversation_id] = msg;
        }
      });

      // 6. Build final list
      const items: ConversationListItem[] = (convs ?? []).map(
        (conv: Conversation) => {
          const memberUserIds = membersByConv[conv.id] ?? [];
          const otherMemberProfiles = memberUserIds
            .filter((id: string) => id !== currentUserId)
            .map((id: string) => profilesMap[id])
            .filter(Boolean);

          return {
            conversation: conv,
            otherMembers: otherMemberProfiles,
            lastMessage: lastMessageMap[conv.id] ?? null,
            lastReadAt: lastReadMap[conv.id] ?? null,
            memberCount: memberUserIds.length,
          };
        }
      );

      // Sort by last message time (most recent first), fallback to updated_at
      items.sort((a, b) => {
        const aTime = a.lastMessage?.created_at || a.conversation.updated_at;
        const bTime = b.lastMessage?.created_at || b.conversation.updated_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setConversations(items);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du chargement des conversations");
    } finally {
      setLoading(false);
    }
  }, [supabase, currentUserId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations, refreshTrigger]);

  // Realtime: listen for new messages across all conversations to update previews
  useEffect(() => {
    const channel = supabase
      .channel("conversation-list-updates")
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "lcb_messages",
        },
        (payload: any) => {
          const newMsg = payload.new as Message;
          setConversations((prev) => {
            const idx = prev.findIndex(
              (c) => c.conversation.id === newMsg.conversation_id
            );
            if (idx === -1) {
              // New conversation we're not tracking - refresh
              fetchConversations();
              return prev;
            }
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              lastMessage: newMsg,
            };
            // Re-sort
            updated.sort((a, b) => {
              const aTime =
                a.lastMessage?.created_at || a.conversation.updated_at;
              const bTime =
                b.lastMessage?.created_at || b.conversation.updated_at;
              return new Date(bTime).getTime() - new Date(aTime).getTime();
            });
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchConversations]);

  // Filter conversations by search
  const filteredConversations = conversations.filter((item) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();

    // Search in conversation name
    if (item.conversation.name?.toLowerCase().includes(query)) return true;

    // Search in other members' names
    return item.otherMembers.some((m) =>
      m.full_name.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3">
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
        <div className="space-y-1 px-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-3">
              <Skeleton className="size-12 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="p-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une conversation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            {search.trim()
              ? "Aucune conversation trouvee"
              : "Aucune conversation"}
          </div>
        ) : (
          <div className="space-y-0.5 px-2 pb-2">
            {filteredConversations.map((item) => {
              const {
                conversation: conv,
                otherMembers,
                lastMessage,
                lastReadAt,
                memberCount,
              } = item;

              const isSelected = conv.id === selectedConversationId;

              // Display name: group name or other person's name
              const displayName = conv.is_group
                ? conv.name || "Groupe"
                : otherMembers[0]?.full_name || "Utilisateur";

              // Unread check
              const hasUnread =
                lastMessage &&
                (!lastReadAt ||
                  new Date(lastMessage.created_at) > new Date(lastReadAt)) &&
                lastMessage.sender_id !== currentUserId;

              // Last message preview
              const preview = lastMessage
                ? lastMessage.content.length > 50
                  ? lastMessage.content.slice(0, 50) + "..."
                  : lastMessage.content
                : "Pas encore de message";

              const timestamp = lastMessage
                ? formatRelativeTime(lastMessage.created_at)
                : formatRelativeTime(conv.created_at);

              return (
                <button
                  key={conv.id}
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-left",
                    isSelected
                      ? "bg-[#1E3A5F]/5"
                      : "hover:bg-gray-50",
                    hasUnread && "font-medium"
                  )}
                  onClick={() => onSelectConversation(conv.id)}
                >
                  {/* Avatar */}
                  {conv.is_group ? (
                    <div className="flex items-center justify-center size-12 rounded-full bg-[#1E3A5F]/10 text-[#1E3A5F] shrink-0">
                      {getGroupIcon(conv.group_type)}
                    </div>
                  ) : (
                    <div className="relative shrink-0">
                      <Avatar className="size-12">
                        {otherMembers[0]?.avatar_url && (
                          <AvatarImage
                            src={otherMembers[0].avatar_url}
                            alt={displayName}
                          />
                        )}
                        <AvatarFallback>
                          {getInitials(displayName)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "text-sm truncate",
                          hasUnread ? "font-semibold" : "font-medium"
                        )}
                      >
                        {displayName}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {timestamp}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p
                        className={cn(
                          "text-xs truncate",
                          hasUnread
                            ? "text-gray-900 font-medium"
                            : "text-muted-foreground"
                        )}
                      >
                        {preview}
                      </p>
                      {hasUnread && (
                        <span className="size-2.5 rounded-full bg-[#D4A853] shrink-0" />
                      )}
                    </div>
                    {conv.is_group && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {memberCount} membres
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
