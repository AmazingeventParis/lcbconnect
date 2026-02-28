"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Newspaper,
  Calendar,
  MessageSquare,
  Bell,
  Menu,
  Ship,
  FileText,
  BookOpen,
  Map,
  User,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hasMinRole } from "@/lib/constants";
import { useNotifications } from "@/lib/hooks/use-notifications";
import type { Profile } from "@/lib/supabase/types";

const MAIN_NAV_ITEMS = [
  { href: "/feed", label: "Fil", icon: Newspaper },
  { href: "/events", label: "Agenda", icon: Calendar },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/notifications", label: "Notifs", icon: Bell },
];

const MORE_NAV_ITEMS = [
  { href: "/avis-batellerie", label: "Avis Batellerie", icon: Ship },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/directory", label: "Annuaire", icon: BookOpen },
  { href: "/carte", label: "Carte", icon: Map },
  { href: "/profile", label: "Mon profil", icon: User },
];

const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Administration", icon: Settings },
];

interface MobileNavProps {
  profile: Profile;
}

export function MobileNav({ profile: _profile }: MobileNavProps) {
  const pathname = usePathname();
  const { unreadCount, sectionCounts } = useNotifications(_profile.id);
  const [moreOpen, setMoreOpen] = useState(false);

  const showAdmin = hasMinRole(_profile.role, "ca");

  const isActive = (href: string) => {
    if (href === "/feed") {
      return pathname === "/feed" || pathname === "/";
    }
    return pathname.startsWith(href);
  };

  // Check if any "more" item is active
  const moreItems = [...MORE_NAV_ITEMS, ...(showAdmin ? ADMIN_NAV_ITEMS : [])];
  const isMoreActive = moreItems.some((item) => isActive(item.href));

  return (
    <>
      {/* Overlay when more menu is open */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More menu panel */}
      {moreOpen && (
        <div className="fixed bottom-14 left-0 right-0 z-50 md:hidden animate-in slide-in-from-bottom-4 duration-200">
          <div className="mx-3 mb-2 rounded-xl border border-border bg-white shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold text-foreground">
                Plus
              </span>
              <button
                onClick={() => setMoreOpen(false)}
                className="flex items-center justify-center size-7 rounded-full hover:bg-accent text-muted-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="py-1">
              {MORE_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                      active
                        ? "bg-[#1E3A5F]/10 text-[#1E3A5F] font-medium"
                        : "text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-5",
                        active ? "text-[#1E3A5F]" : "text-muted-foreground"
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
              {showAdmin && (
                <>
                  <div className="border-t border-border my-1" />
                  {ADMIN_NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                          active
                            ? "bg-[#1E3A5F]/10 text-[#1E3A5F] font-medium"
                            : "text-foreground hover:bg-accent"
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-5",
                            active ? "text-[#1E3A5F]" : "text-muted-foreground"
                          )}
                        />
                        {item.label}
                      </Link>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.05)] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        {MAIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMoreOpen(false)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors",
                active
                  ? "text-[#1E3A5F]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="relative">
                <Icon
                  className={cn(
                    "size-5",
                    active ? "text-[#1E3A5F]" : "text-muted-foreground"
                  )}
                />
                {item.href === "/notifications" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex items-center justify-center size-3.5 rounded-full bg-[#D4A853] text-[8px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
                {item.href === "/feed" && sectionCounts.feed > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex items-center justify-center size-3.5 rounded-full bg-[#D4A853] text-[8px] font-bold text-white">
                    {sectionCounts.feed > 9 ? "9+" : sectionCounts.feed}
                  </span>
                )}
                {item.href === "/events" && sectionCounts.events > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex items-center justify-center size-3.5 rounded-full bg-[#D4A853] text-[8px] font-bold text-white">
                    {sectionCounts.events > 9 ? "9+" : sectionCounts.events}
                  </span>
                )}
                {item.href === "/messages" && sectionCounts.messages > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex items-center justify-center size-3.5 rounded-full bg-[#D4A853] text-[8px] font-bold text-white">
                    {sectionCounts.messages > 9 ? "9+" : sectionCounts.messages}
                  </span>
                )}
              </span>
              {item.label}
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors",
            moreOpen || isMoreActive
              ? "text-[#1E3A5F]"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Menu
            className={cn(
              "size-5",
              moreOpen || isMoreActive ? "text-[#1E3A5F]" : "text-muted-foreground"
            )}
          />
          Plus
        </button>
      </nav>
    </>
  );
}
