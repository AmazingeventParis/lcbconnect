"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, LogOut, Settings, User } from "lucide-react";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { hasMinRole } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Profile } from "@/lib/supabase/types";

const ROUTE_TITLES: Record<string, string> = {
  "/feed": "Fil d'actualités",
  "/services": "Services",
  "/complaints": "Plaintes",
  "/avis-batellerie": "Avis Batellerie",
  "/documents": "Documents",
  "/events": "Agenda",
  "/directory": "Annuaire",
  "/armada": "Mon Armada",
  "/messages": "Messagerie",
  "/notifications": "Notifications",
  "/settings": "Réglages",
  "/admin": "Administration",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getPageTitle(pathname: string): string {
  // Check exact match first
  if (ROUTE_TITLES[pathname]) {
    return ROUTE_TITLES[pathname];
  }
  // Check prefix match for nested routes
  for (const [route, title] of Object.entries(ROUTE_TITLES)) {
    if (pathname.startsWith(route)) {
      return title;
    }
  }
  return "LCBconnect";
}

interface HeaderProps {
  profile: Profile;
}

export function Header({ profile }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const pageTitle = getPageTitle(pathname);
  const showAdmin = hasMinRole(profile.role, "ca");
  const { unreadCount } = useNotifications(profile.id);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 md:px-6 shadow-sm bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      {/* Left: page title */}
      <div className="flex items-center">
        <h1 className="text-lg font-semibold text-foreground">
          <span className="hidden md:inline">{pageTitle}</span>
          <span className="md:hidden">LCBconnect</span>
        </h1>
      </div>

      {/* Right: notifications + user dropdown */}
      <div className="flex items-center gap-2">
        <Link
          href="/notifications"
          className="relative rounded-lg p-2 hover:bg-accent transition-colors"
          title="Notifications"
        >
          <Bell className="size-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-[#D4A853] text-[10px] font-bold text-white px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-accent transition-colors focus:outline-none">
              <Avatar size="sm">
                <AvatarImage
                  src={profile.avatar_url ?? undefined}
                  alt={profile.full_name}
                />
                <AvatarFallback className="bg-[#1E3A5F]/10 text-[#1E3A5F] text-[10px]">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:inline text-sm font-medium text-foreground">
                {profile.full_name}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={`/armada/${profile.id}`} className="cursor-pointer">
                <User className="size-4" />
                Mon profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <Settings className="size-4" />
                Réglages
              </Link>
            </DropdownMenuItem>
            {showAdmin && (
              <DropdownMenuItem asChild>
                <Link href="/admin" className="cursor-pointer">
                  <Settings className="size-4" />
                  Administration
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              variant="destructive"
              className="cursor-pointer"
            >
              <LogOut className="size-4" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
