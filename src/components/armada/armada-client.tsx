"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Users } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberCard } from "./member-card";

interface ArmadaClientProps {
  profile: Profile;
}

export function ArmadaClient({ profile: _profile }: ArmadaClientProps) {
  const supabase = createClient();
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchMembers = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("lcb_profiles")
      .select("*")
      .eq("status", "approved")
      .order("full_name", { ascending: true });

    if (!error && data) {
      setMembers(data);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const filteredMembers = members.filter((member) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      member.full_name.toLowerCase().includes(q) ||
      (member.boat_name && member.boat_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Mon Armada</h1>
        <p className="text-muted-foreground mt-1">
          {loading
            ? "Chargement des membres..."
            : `${members.length} membre${members.length > 1 ? "s" : ""} dans l'armada`}
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou nom de bateau..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl border p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Aucun membre trouvé</h3>
          <p className="text-muted-foreground mt-1 max-w-md">
            {searchQuery
              ? `Aucun résultat pour "${searchQuery}".`
              : "Aucun membre dans l'armada pour le moment."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredMembers.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      )}
    </div>
  );
}
