"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Anchor,
  Newspaper,
  AlertTriangle,
  Ship,
  FileText,
  Calendar,
  BookOpen,
  MessageSquare,
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
  { href: "/complaints", label: "Plaintes", icon: AlertTriangle },
  { href: "/avis-batellerie", label: "Avis Batellerie", icon: Ship },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/events", label: "Evenements", icon: Calendar },
  { href: "/directory", label: "Annuaire", icon: BookOpen },
  { href: "/messages", label: "Messages", icon: MessageSquare },
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
    <aside className="hidden md:flex md:flex-col md:w-[280px] md:min-h-screen border-r border-slate-200 bg-slate-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200">
        <div className="flex items-center justify-center size-9 rounded-lg bg-blue-600">
          <Anchor className="size-5 text-white" />
        </div>
        <span className="text-xl font-bold text-slate-900">LCBconnect</span>
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
                    ? "bg-blue-100 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon
                  className={cn(
                    "size-5 shrink-0",
                    active ? "text-blue-600" : "text-slate-400"
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
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
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
                        ? "bg-blue-100 text-blue-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-5 shrink-0",
                        active ? "text-blue-600" : "text-slate-400"
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
      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 rounded-lg p-3">
          <Link href="/profile" className="shrink-0">
            <Avatar>
              <AvatarImage
                src={profile.avatar_url ?? undefined}
                alt={profile.full_name}
              />
              <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <Link href="/profile">
              <p className="text-sm font-medium text-slate-900 truncate">
                {profile.full_name}
              </p>
            </Link>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 font-normal"
            >
              {ROLE_LABELS[profile.role]}
            </Badge>
          </div>
          <Link
            href="/notifications"
            className="shrink-0 flex items-center justify-center size-9 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <Bell className="size-5" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
