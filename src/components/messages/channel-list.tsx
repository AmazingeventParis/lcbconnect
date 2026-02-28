"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  UsersRound,
  Shield,
  LogIn,
  LogOut,
  Loader2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Channel {
  id: string;
  name: string;
  group_type: string;
  joined: boolean;
  member_count: number;
}

interface ChannelListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChannelJoined: () => void;
}

export function ChannelList({
  open,
  onOpenChange,
  onChannelJoined,
}: ChannelListProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/channels");
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels ?? []);
      }
    } catch {
      toast.error("Erreur de connexion");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) fetchChannels();
  }, [open, fetchChannels]);

  const handleJoin = async (channelId: string) => {
    setActionLoading(channelId);
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      if (res.ok) {
        setChannels((prev) =>
          prev.map((ch) =>
            ch.id === channelId
              ? { ...ch, joined: true, member_count: ch.member_count + 1 }
              : ch
          )
        );
        toast.success("Vous avez rejoint le groupe");
        onChannelJoined();
      } else {
        toast.error("Erreur lors de l'inscription");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
    setActionLoading(null);
  };

  const handleLeave = async (channelId: string) => {
    setActionLoading(channelId);
    try {
      const res = await fetch("/api/channels", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      if (res.ok) {
        setChannels((prev) =>
          prev.map((ch) =>
            ch.id === channelId
              ? { ...ch, joined: false, member_count: Math.max(0, ch.member_count - 1) }
              : ch
          )
        );
        toast.success("Vous avez quitté le groupe");
        onChannelJoined();
      } else {
        toast.error("Erreur lors de la désinscription");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
    setActionLoading(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Groupes</DialogTitle>
          <DialogDescription>
            Rejoignez les groupes qui vous intéressent
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : channels.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Aucun groupe disponible
            </div>
          ) : (
            <div className="space-y-2">
              {channels.map((channel) => {
                const isCA = channel.group_type === "channel_ca";
                const isLoading = actionLoading === channel.id;

                return (
                  <div
                    key={channel.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                      channel.joined
                        ? "border-[#1E3A5F]/20 bg-[#1E3A5F]/5"
                        : "border-border"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center size-10 rounded-full shrink-0",
                        isCA
                          ? "bg-purple-100 text-purple-700"
                          : "bg-[#1E3A5F]/10 text-[#1E3A5F]"
                      )}
                    >
                      {isCA ? (
                        <Shield className="size-4" />
                      ) : (
                        <UsersRound className="size-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {channel.name}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="size-3" />
                        {channel.member_count} membre{channel.member_count !== 1 ? "s" : ""}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant={channel.joined ? "outline" : "default"}
                      disabled={isLoading}
                      onClick={() =>
                        channel.joined
                          ? handleLeave(channel.id)
                          : handleJoin(channel.id)
                      }
                      className="shrink-0"
                    >
                      {isLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : channel.joined ? (
                        <>
                          <LogOut className="size-3.5" />
                          Quitter
                        </>
                      ) : (
                        <>
                          <LogIn className="size-3.5" />
                          Rejoindre
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
