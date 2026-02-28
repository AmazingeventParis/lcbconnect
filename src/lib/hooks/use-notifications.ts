"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/supabase/types";

export type SectionCounts = {
  feed: number;
  messages: number;
  events: number;
  documents: number;
  directory: number;
  admin: number;
  total: number;
};

const EMPTY_COUNTS: SectionCounts = {
  feed: 0,
  messages: 0,
  events: 0,
  documents: 0,
  directory: 0,
  admin: 0,
  total: 0,
};

function computeSectionCounts(types: string[]): SectionCounts {
  const counts = { ...EMPTY_COUNTS };
  for (const t of types) {
    switch (t) {
      case "like":
      case "comment":
      case "reply":
        counts.feed++;
        break;
      case "message":
        counts.messages++;
        break;
      case "event":
        counts.events++;
        break;
      case "document":
        counts.documents++;
        break;
      case "directory":
        counts.directory++;
        break;
      case "admin":
      case "complaint":
      case "service":
      case "report":
        counts.admin++;
        break;
      case "mention":
        counts.messages++;
        break;
    }
    counts.total++;
  }
  return counts;
}

export function useNotifications(userId: string | undefined) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [sectionCounts, setSectionCounts] = useState<SectionCounts>(EMPTY_COUNTS);
  const supabase = createClient();

  const fetchCount = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await (supabase as any)
      .from("lcb_notifications")
      .select("type")
      .eq("user_id", userId)
      .eq("is_read", false);

    if (!error && data) {
      const types = (data as { type: string }[]).map((r) => r.type);
      const counts = computeSectionCounts(types);
      setUnreadCount(counts.total);
      setSectionCounts(counts);
    }
  }, [supabase, userId]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("notifications-count")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "lcb_notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchCount();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "lcb_notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, fetchCount]);

  return {
    unreadCount,
    sectionCounts,
    refreshCount: fetchCount,
  };
}
