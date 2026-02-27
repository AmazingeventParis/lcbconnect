"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Newspaper,
  Wrench,
  MessageSquare,
  Bell,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/lib/hooks/use-notifications";
import type { Profile } from "@/lib/supabase/types";

const MOBILE_NAV_ITEMS = [
  { href: "/feed", label: "Fil", icon: Newspaper },
  { href: "/services", label: "Services", icon: Wrench },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/notifications", label: "Notifs", icon: Bell },
  { href: "/profile", label: "Profil", icon: User },
];

interface MobileNavProps {
  profile: Profile;
}

export function MobileNav({ profile: _profile }: MobileNavProps) {
  const pathname = usePathname();
  const { unreadCount } = useNotifications(_profile.id);

  const isActive = (href: string) => {
    if (href === "/feed") {
      return pathname === "/feed" || pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      {MOBILE_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors",
              active
                ? "text-blue-600"
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            <span className="relative">
              <Icon
                className={cn(
                  "size-5",
                  active ? "text-blue-600" : "text-slate-400"
                )}
              />
              {item.href === "/notifications" && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1.5 flex items-center justify-center size-3.5 rounded-full bg-red-500 text-[8px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
