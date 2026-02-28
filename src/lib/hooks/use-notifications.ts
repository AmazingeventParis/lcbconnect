"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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

const SECTION_TYPES: Record<string, string[]> = {
  feed: ["like", "comment", "reply"],
  messages: ["message", "mention"],
  events: ["event"],
  documents: ["document"],
  directory: ["directory"],
  admin: ["admin", "complaint", "service", "report"],
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
  const supabase = useMemo(() => createClient(), []);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const fetchCount = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) return;

    const { data, error } = await (supabase as any)
      .from("lcb_notifications")
      .select("type")
      .eq("user_id", uid)
      .eq("is_read", false);

    if (!error && data) {
      const types = (data as { type: string }[]).map((r) => r.type);
      const counts = computeSectionCounts(types);
      setUnreadCount(counts.total);
      setSectionCounts(counts);
    }
  }, [supabase]);

  // Mark all notifications for a given section as read
  const markSectionRead = useCallback(
    async (section: keyof SectionCounts) => {
      const uid = userIdRef.current;
      if (!uid || section === "total") return;
      const types = SECTION_TYPES[section];
      if (!types || types.length === 0) return;

      await (supabase as any)
        .from("lcb_notifications")
        .update({ is_read: true })
        .eq("user_id", uid)
        .eq("is_read", false)
        .in("type", types);

      // Refresh counts after marking
      fetchCount();
    },
    [supabase, fetchCount]
  );

  // Initial fetch
  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Instant refresh when current tab sends a notification
  useEffect(() => {
    const handler = () => {
      // Small delay to let the DB insert commit
      setTimeout(fetchCount, 300);
    };
    window.addEventListener("lcb-notification-sent", handler);
    return () => window.removeEventListener("lcb-notification-sent", handler);
  }, [fetchCount]);

  // Polling fallback every 15s (in case Realtime misses events)
  useEffect(() => {
    const interval = setInterval(fetchCount, 15000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-count-${userId}`)
      .on(
        "postgres_changes" as any,
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
        "postgres_changes" as any,
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
    markSectionRead,
  };
}
