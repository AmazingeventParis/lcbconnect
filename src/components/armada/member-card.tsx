"use client";

import Link from "next/link";
import { Ship, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import { ROLES } from "@/lib/constants";
import type { Profile } from "@/lib/supabase/types";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ROLE_COLORS: Record<string, string> = {
  membre: "bg-gray-100 text-gray-700",
  ca: "bg-blue-100 text-blue-700",
  bureau: "bg-purple-100 text-purple-700",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface MemberCardProps {
  member: Profile;
}

export function MemberCard({ member }: MemberCardProps) {
  return (
    <Link href={`/armada/${member.id}`}>
      <Card className="gap-0 py-0 overflow-hidden transition-all hover:shadow-md hover:border-[#D4A853]/30 cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar size="lg">
              {member.avatar_url && (
                <AvatarImage
                  src={member.avatar_url}
                  alt={member.full_name}
                />
              )}
              <AvatarFallback className="bg-[#1E3A5F]/10 text-[#1E3A5F]">
                {getInitials(member.full_name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm truncate">
                  {member.full_name}
                </span>
                {member.role !== "membre" && (
                  <Badge
                    variant="secondary"
                    className={cn("text-[10px] py-0", ROLE_COLORS[member.role])}
                  >
                    {ROLES[member.role].label}
                  </Badge>
                )}
              </div>

              {member.boat_name && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <Ship className="size-3.5 shrink-0" />
                  <span className="truncate">
                    {member.boat_name}
                    {member.boat_type && (
                      <span className="text-muted-foreground/60">
                        {" "}
                        &middot; {member.boat_type}
                      </span>
                    )}
                  </span>
                </div>
              )}

              {member.mooring_port && (
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" />
                  <span className="truncate">{member.mooring_port}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
