"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Users, MessageSquarePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/supabase/types";

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  onConversationCreated: (conversationId: string) => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function NewConversationDialog({
  open,
  onOpenChange,
  currentUserId,
  onConversationCreated,
}: NewConversationDialogProps) {
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Fetch approved members
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const query = (supabase as any)
      .from("lcb_profiles")
      .select("*")
      .eq("status", "approved")
      .neq("id", currentUserId)
      .order("full_name", { ascending: true })
      .limit(50);

    if (search.trim()) {
      query.ilike("full_name", `%${search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) {
      toast.error("Erreur lors du chargement des membres");
    } else {
      setMembers(data ?? []);
    }
    setLoading(false);
  }, [supabase, currentUserId, search]);

  useEffect(() => {
    if (open) {
      fetchMembers();
    } else {
      // Reset state on close
      setSearch("");
      setSelectedUsers([]);
      setIsGroupMode(false);
      setGroupName("");
    }
  }, [open, fetchMembers]);

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Create 1:1 conversation or navigate to existing one
  const handleCreateDirectConversation = async (otherUserId: string) => {
    setCreating(true);
    try {
      // Check if a 1:1 conversation already exists between these two users
      const { data: myConversations } = await (supabase as any)
        .from("lcb_conversation_members")
        .select("conversation_id")
        .eq("user_id", currentUserId);

      const myConvIds = (myConversations ?? []).map(
        (m: any) => m.conversation_id
      );

      if (myConvIds.length > 0) {
        const { data: theirConversations } = await (supabase as any)
          .from("lcb_conversation_members")
          .select("conversation_id")
          .eq("user_id", otherUserId)
          .in("conversation_id", myConvIds);

        const sharedConvIds = (theirConversations ?? []).map(
          (m: any) => m.conversation_id
        );

        if (sharedConvIds.length > 0) {
          // Check if any of these shared conversations are 1:1 (not group)
          const { data: existingConvs } = await (supabase as any)
            .from("lcb_conversations")
            .select("id")
            .in("id", sharedConvIds)
            .eq("is_group", false);

          if (existingConvs && existingConvs.length > 0) {
            onConversationCreated(existingConvs[0].id);
            onOpenChange(false);
            setCreating(false);
            return;
          }
        }
      }

      // Create new conversation
      const { data: conv, error: convError } = await (supabase as any)
        .from("lcb_conversations")
        .insert({
          is_group: false,
          created_by: currentUserId,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add both members
      const { error: membersError } = await (supabase as any)
        .from("lcb_conversation_members")
        .insert([
          { conversation_id: conv.id, user_id: currentUserId },
          { conversation_id: conv.id, user_id: otherUserId },
        ]);

      if (membersError) throw membersError;

      onConversationCreated(conv.id);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la creation de la conversation");
    } finally {
      setCreating(false);
    }
  };

  // Create group conversation
  const handleCreateGroup = async () => {
    if (selectedUsers.length < 2) {
      toast.error("Selectionnez au moins 2 membres pour un groupe");
      return;
    }
    if (!groupName.trim()) {
      toast.error("Le nom du groupe est requis");
      return;
    }

    setCreating(true);
    try {
      const { data: conv, error: convError } = await (supabase as any)
        .from("lcb_conversations")
        .insert({
          name: groupName.trim(),
          is_group: true,
          group_type: "custom",
          created_by: currentUserId,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add current user + selected members
      const memberInserts = [currentUserId, ...selectedUsers].map(
        (userId) => ({
          conversation_id: conv.id,
          user_id: userId,
        })
      );

      const { error: membersError } = await (supabase as any)
        .from("lcb_conversation_members")
        .insert(memberInserts);

      if (membersError) throw membersError;

      onConversationCreated(conv.id);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la creation du groupe");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle conversation</DialogTitle>
          <DialogDescription>
            {isGroupMode
              ? "Creez un groupe de discussion"
              : "Selectionnez un membre pour demarrer une conversation"}
          </DialogDescription>
        </DialogHeader>

        {/* Toggle mode */}
        <div className="flex gap-2">
          <Button
            variant={isGroupMode ? "outline" : "default"}
            size="sm"
            onClick={() => {
              setIsGroupMode(false);
              setSelectedUsers([]);
            }}
          >
            <MessageSquarePlus className="size-4 mr-1" />
            Direct
          </Button>
          <Button
            variant={isGroupMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsGroupMode(true)}
          >
            <Users className="size-4 mr-1" />
            Groupe
          </Button>
        </div>

        {/* Group name input */}
        {isGroupMode && (
          <div className="space-y-1.5">
            <Label htmlFor="group-name">Nom du groupe</Label>
            <Input
              id="group-name"
              placeholder="Ex: Equipage du port"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un membre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Members list */}
        <ScrollArea className="h-[300px] -mx-2">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Aucun membre trouve
            </div>
          ) : (
            <div className="space-y-0.5 px-2">
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  disabled={creating}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
                    "hover:bg-gray-100",
                    isGroupMode &&
                      selectedUsers.includes(member.id) &&
                      "bg-blue-50 hover:bg-blue-100"
                  )}
                  onClick={() => {
                    if (isGroupMode) {
                      toggleUser(member.id);
                    } else {
                      handleCreateDirectConversation(member.id);
                    }
                  }}
                >
                  {isGroupMode && (
                    <Checkbox
                      checked={selectedUsers.includes(member.id)}
                      onCheckedChange={() => toggleUser(member.id)}
                      className="pointer-events-none"
                    />
                  )}
                  <Avatar size="sm" className="size-9">
                    {member.avatar_url && (
                      <AvatarImage
                        src={member.avatar_url}
                        alt={member.full_name}
                      />
                    )}
                    <AvatarFallback className="text-xs">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {member.full_name}
                    </p>
                    {member.boat_name && (
                      <p className="text-xs text-muted-foreground truncate">
                        {member.boat_name}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground capitalize shrink-0">
                    {member.role}
                  </span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Group create button */}
        {isGroupMode && (
          <Button
            onClick={handleCreateGroup}
            disabled={creating || selectedUsers.length < 2 || !groupName.trim()}
            className="w-full"
          >
            {creating && <Loader2 className="size-4 mr-2 animate-spin" />}
            Creer le groupe ({selectedUsers.length} membres)
          </Button>
        )}

        {creating && !isGroupMode && (
          <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 mr-2 animate-spin" />
            Creation en cours...
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
