"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Newspaper,
  Ship,
  FileText,
  Calendar,
  BookOpen,
  Users,
  MessageSquare,
  Map,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hasMinRole } from "@/lib/constants";
import { useNotifications } from "@/lib/hooks/use-notifications";
import type { Profile } from "@/lib/supabase/types";
import type { SectionCounts } from "@/lib/hooks/use-notifications";

const NAV_ITEMS = [
  { href: "/feed", label: "Fil d'actualités", icon: Newspaper },
  { href: "/armada", label: "Mon Armada", icon: Users },
  { href: "/messages", label: "Messagerie", icon: MessageSquare },
  { href: "/events", label: "Agenda", icon: Calendar },
  { href: "/directory", label: "Annuaire", icon: BookOpen },
  { href: "/avis-batellerie", label: "Avis Batellerie", icon: Ship },
  { href: "/carte", label: "Carte", icon: Map },
  { href: "/documents", label: "Documents", icon: FileText },
];

const ADMIN_ITEMS = [
  { href: "/admin", label: "Administration", icon: Settings },
];

const HREF_TO_SECTION: Record<string, keyof SectionCounts> = {
  "/feed": "feed",
  "/messages": "messages",
  "/events": "events",
  "/documents": "documents",
  "/directory": "directory",
  "/admin": "admin",
};

interface SidebarProps {
  profile: Profile;
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const { sectionCounts, markSectionRead } = useNotifications(profile.id);

  const isActive = (href: string) => {
    if (href === "/feed") {
      return pathname === "/feed" || pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const showAdmin = hasMinRole(profile.role, "ca");

  const handleNavClick = (href: string) => {
    const section = HREF_TO_SECTION[href];
    if (section && sectionCounts[section] > 0) {
      markSectionRead(section);
    }
  };

  return (
    <aside className="hidden md:flex md:flex-col md:w-[280px] md:min-h-screen border-r border-white/10 bg-[#1E3A5F]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <Image
          src="/logo.jpg"
          alt="La Cerise sur le Bateau"
          width={36}
          height={36}
          className="size-9 rounded-lg object-cover"
        />
        <span className="text-xl font-bold text-white">LCBconnect</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const section = HREF_TO_SECTION[item.href];
            const count = section ? sectionCounts[section] : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => handleNavClick(item.href)}
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
                {count > 0 && (
                  <span className="ml-auto flex items-center justify-center min-w-5 h-5 rounded-full bg-[#D4A853] text-[10px] font-bold text-white px-1">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
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
                const section = HREF_TO_SECTION[item.href];
                const count = section ? sectionCounts[section] : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => handleNavClick(item.href)}
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
                    {count > 0 && (
                      <span className="ml-auto flex items-center justify-center min-w-5 h-5 rounded-full bg-[#D4A853] text-[10px] font-bold text-white px-1">
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Spacer */}
      <div className="border-t border-white/10" />
    </aside>
  );
}
