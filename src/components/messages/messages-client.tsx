"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ConversationList } from "./conversation-list";
import { ChatView } from "./chat-view";
import { NewConversationDialog } from "./new-conversation-dialog";
import { MessageSquarePlus, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/supabase/types";

interface MessagesClientProps {
  profile: Profile;
}

export function MessagesClient({ profile }: MessagesClientProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleConversationCreated = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedConversationId(null);
  }, []);

  return (
    <div className="flex h-[calc(100vh-64px)] md:h-[calc(100vh-64px)]">
      {/* Left panel: Conversation list */}
      <div
        className={cn(
          "w-full md:w-80 lg:w-96 border-r flex flex-col bg-white shrink-0",
          selectedConversationId ? "hidden md:flex" : "flex"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <h1 className="text-lg font-bold">Messages</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNewDialog(true)}
            title="Nouvelle conversation"
          >
            <MessageSquarePlus className="size-5" />
          </Button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 min-h-0">
          <ConversationList
            currentUserId={profile.id}
            selectedConversationId={selectedConversationId}
            onSelectConversation={setSelectedConversationId}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>

      {/* Right panel: Chat view */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 bg-white",
          selectedConversationId ? "flex" : "hidden md:flex"
        )}
      >
        {selectedConversationId ? (
          <ChatView
            key={selectedConversationId}
            conversationId={selectedConversationId}
            currentUserId={profile.id}
            onBack={handleBack}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageCircle className="size-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">Vos messages</p>
            <p className="text-sm mt-1">
              Sélectionnez une conversation ou démarrez-en une nouvelle
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowNewDialog(true)}
            >
              <MessageSquarePlus className="size-4 mr-2" />
              Nouvelle conversation
            </Button>
          </div>
        )}
      </div>

      {/* New conversation dialog */}
      <NewConversationDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        currentUserId={profile.id}
        onConversationCreated={handleConversationCreated}
      />
    </div>
  );
}
