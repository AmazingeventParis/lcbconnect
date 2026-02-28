"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Anchor,
  Newspaper,
  Ship,
  FileText,
  Calendar,
  BookOpen,
  MessageSquare,
  Map,
  Settings,
  Bell,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hasMinRole } from "@/lib/constants";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Profile } from "@/lib/supabase/types";
import type { Role } from "@/lib/constants";

const ROLE_LABELS: Record<Role, string> = {
  membre: "Membre",
  ca: "Conseil d'Administration",
  bureau: "Bureau",
};

const NAV_ITEMS = [
  { href: "/feed", label: "Fil d'actualites", icon: Newspaper },
  { href: "/avis-batellerie", label: "Avis Batellerie", icon: Ship },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/events", label: "Evenements", icon: Calendar },
  { href: "/directory", label: "Annuaire", icon: BookOpen },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/carte", label: "Carte", icon: Map },
];

const ADMIN_ITEMS = [
  { href: "/admin", label: "Administration", icon: Settings },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface SidebarProps {
  profile: Profile;
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/feed") {
      return pathname === "/feed" || pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const showAdmin = hasMinRole(profile.role, "ca");

  return (
    <aside className="hidden md:flex md:flex-col md:w-[280px] md:min-h-screen border-r border-white/10 bg-[#1E3A5F]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="flex items-center justify-center size-9 rounded-lg bg-[#D4A853]">
          <Anchor className="size-5 text-white" />
        </div>
        <span className="text-xl font-bold text-white">LCBconnect</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/10 text-white border-l-3 border-[#D4A853]"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                )}
              >
                <Icon
                  className={cn(
                    "size-5 shrink-0",
                    active ? "text-white" : "text-slate-400"
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Admin section */}
        {showAdmin && (
          <div className="mt-6">
            <div className="px-3 mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Administration
              </p>
            </div>
            <div className="space-y-1">
              {ADMIN_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-white/10 text-white border-l-3 border-[#D4A853]"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-5 shrink-0",
                        active ? "text-white" : "text-slate-400"
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg p-3">
          <Link href="/profile" className="shrink-0">
            <Avatar>
              <AvatarImage
                src={profile.avatar_url ?? undefined}
                alt={profile.full_name}
              />
              <AvatarFallback className="bg-[#D4A853]/20 text-[#D4A853] text-xs">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <Link href="/profile">
              <p className="text-sm font-medium text-white truncate">
                {profile.full_name}
              </p>
            </Link>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 font-normal bg-white/10 text-slate-300 border-0"
            >
              {ROLE_LABELS[profile.role]}
            </Badge>
          </div>
          <Link
            href="/notifications"
            className="shrink-0 flex items-center justify-center size-9 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Bell className="size-5" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
