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
  const { unreadCount } = useNotifications(_profile.id);
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
          <div className="mx-3 mb-2 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-700">
                Plus
              </span>
              <button
                onClick={() => setMoreOpen(false)}
                className="flex items-center justify-center size-7 rounded-full hover:bg-slate-100 text-slate-400"
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
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-5",
                        active ? "text-blue-600" : "text-slate-400"
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
              {showAdmin && (
                <>
                  <div className="border-t border-slate-100 my-1" />
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
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-5",
                            active ? "text-blue-600" : "text-slate-400"
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
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

        {/* More button */}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors",
            moreOpen || isMoreActive
              ? "text-blue-600"
              : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Menu
            className={cn(
              "size-5",
              moreOpen || isMoreActive ? "text-blue-600" : "text-slate-400"
            )}
          />
          Plus
        </button>
      </nav>
    </>
  );
}
