"use client";

import { useState, useTransition } from "react";
import {
  Heart,
  MessageCircle,
  Reply,
  MessageSquare,
  AtSign,
  Calendar,
  FileText,
  BookOpen,
  Flag,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Switch } from "@/components/ui/switch";
import type { NotificationPrefs } from "@/lib/supabase/types";

const PREF_ITEMS: {
  key: keyof NotificationPrefs;
  label: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
}[] = [
  {
    key: "likes",
    label: "J'aime",
    description: "Quand quelqu'un aime votre publication",
    icon: Heart,
    iconColor: "text-red-500",
  },
  {
    key: "comments",
    label: "Commentaires",
    description: "Quand quelqu'un commente votre publication",
    icon: MessageCircle,
    iconColor: "text-blue-500",
  },
  {
    key: "replies",
    label: "Réponses",
    description: "Quand quelqu'un répond à votre commentaire",
    icon: Reply,
    iconColor: "text-indigo-500",
  },
  {
    key: "messages",
    label: "Messages",
    description: "Nouveaux messages dans vos conversations",
    icon: MessageSquare,
    iconColor: "text-green-500",
  },
  {
    key: "mentions",
    label: "Mentions",
    description: "Quand quelqu'un vous mentionne avec @",
    icon: AtSign,
    iconColor: "text-violet-500",
  },
  {
    key: "events",
    label: "Événements",
    description: "Nouveaux événements et inscriptions",
    icon: Calendar,
    iconColor: "text-orange-500",
  },
  {
    key: "documents",
    label: "Documents",
    description: "Nouveaux documents partagés",
    icon: FileText,
    iconColor: "text-amber-600",
  },
  {
    key: "directory",
    label: "Annuaire",
    description: "Nouvelles adresses et avis",
    icon: BookOpen,
    iconColor: "text-teal-500",
  },
  {
    key: "reports",
    label: "Signalements",
    description: "Signalements et modération",
    icon: Flag,
    iconColor: "text-red-600",
  },
];

interface NotificationSettingsProps {
  profileId: string;
  initialPrefs: NotificationPrefs | null;
  role: string;
}

export function NotificationSettings({
  profileId,
  initialPrefs,
  role,
}: NotificationSettingsProps) {
  const supabase = createClient();
  const [prefs, setPrefs] = useState<NotificationPrefs>(initialPrefs ?? {});
  const [isPending, startTransition] = useTransition();

  const isAdmin = role === "ca" || role === "bureau";

  // Filter items based on role
  const items = PREF_ITEMS.filter((item) => {
    if (item.key === "reports") return isAdmin;
    return true;
  });

  function isEnabled(key: keyof NotificationPrefs): boolean {
    return prefs[key] !== false;
  }

  function handleToggle(key: keyof NotificationPrefs, checked: boolean) {
    const newPrefs = { ...prefs, [key]: checked };
    setPrefs(newPrefs);

    startTransition(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("lcb_profiles")
        .update({
          notification_prefs: newPrefs,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileId);

      if (error) {
        // Revert on error
        setPrefs(prefs);
        toast.error("Erreur lors de la sauvegarde.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Notifications</h2>
        <p className="text-sm text-muted-foreground">
          Choisissez les notifications que vous souhaitez recevoir.
        </p>
      </div>

      <div className="rounded-lg border border-border divide-y divide-border">
        {items.map((item) => {
          const Icon = item.icon;
          const enabled = isEnabled(item.key);
          return (
            <label
              key={item.key}
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors first:rounded-t-lg last:rounded-b-lg"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`size-5 shrink-0 ${item.iconColor}`} />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.description}
                  </div>
                </div>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={(checked) => handleToggle(item.key, checked)}
                disabled={isPending}
                className="ml-3 shrink-0"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
