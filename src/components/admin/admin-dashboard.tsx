"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  FileText,
  AlertTriangle,
  Calendar,
  ArrowRight,
  BarChart3,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminDashboardProps {
  profile: Profile;
  stats: {
    approvedMembers: number;
    pendingMembers: number;
    postsThisMonth: number;
    upcomingEvents: number;
  };
}

const STAT_CARDS = [
  {
    key: "approvedMembers" as const,
    label: "Total membres",
    icon: Users,
    color: "text-[#1E3A5F]",
    bg: "bg-[#1E3A5F]/10",
  },
  {
    key: "pendingMembers" as const,
    label: "Membres en attente",
    icon: UserPlus,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    key: "postsThisMonth" as const,
    label: "Publications ce mois",
    icon: FileText,
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    key: "upcomingEvents" as const,
    label: "Événements à venir",
    icon: Calendar,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
];

export function AdminDashboard({ profile, stats }: AdminDashboardProps) {
  const supabase = createClient();
  const [weeklyPosts, setWeeklyPosts] = useState<number[]>([]);

  // Fetch posts per week for the last 4 weeks (simple bar chart)
  const fetchWeeklyPosts = useCallback(async () => {
    const weeks: number[] = [];
    const now = new Date();

    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i + 1) * 7);
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - i * 7);

      const { count } = await (supabase as any)
        .from("lcb_posts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekStart.toISOString())
        .lt("created_at", weekEnd.toISOString());

      weeks.push(count ?? 0);
    }

    setWeeklyPosts(weeks);
  }, [supabase]);

  useEffect(() => {
    fetchWeeklyPosts();
  }, [fetchWeeklyPosts]);

  const maxWeeklyPosts = Math.max(...weeklyPosts, 1);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">
          Vue d&apos;ensemble de la communauté LCBconnect.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, color, bg }) => (
          <Card key={key} className="gap-0 py-0">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {label}
                </CardTitle>
                <div className={`rounded-lg p-1.5 ${bg}`}>
                  <Icon className={`size-4 ${color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-2xl font-bold">{stats[key]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Simple bar chart - Posts per week */}
        <Card className="gap-0 py-0">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-5 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">
                Publications par semaine
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {weeklyPosts.length > 0 ? (
              <div className="flex items-end gap-3 h-40">
                {weeklyPosts.map((count, i) => {
                  const height = Math.max(
                    (count / maxWeeklyPosts) * 100,
                    4
                  );
                  const weekLabels = ["S-4", "S-3", "S-2", "S-1"];
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <span className="text-xs font-medium text-slate-700">
                        {count}
                      </span>
                      <div
                        className="w-full rounded-t-md bg-[#1E3A5F] transition-all duration-300"
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {weekLabels[i]}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                Chargement...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="gap-0 py-0">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base font-semibold">
              Actions rapides
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <Link href="/admin/members" className="block">
              <Button
                variant="outline"
                className="w-full justify-between h-auto py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-[#1E3A5F]/10 p-2">
                    <Users className="size-4 text-[#1E3A5F]" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Gestion des membres</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.pendingMembers > 0
                        ? `${stats.pendingMembers} en attente d'approbation`
                        : "Aucun membre en attente"}
                    </p>
                  </div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </Button>
            </Link>

            <Link href="/admin/reports" className="block">
              <Button
                variant="outline"
                className="w-full justify-between h-auto py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-orange-50 p-2">
                    <AlertTriangle className="size-4 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">
                      Modération de contenu
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Signalements de publications et commentaires
                    </p>
                  </div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
