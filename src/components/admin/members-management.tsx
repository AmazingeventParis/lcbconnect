"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowUpDown,
  Check,
  Search,
  Users,
  X,
  Loader2,
  MoreHorizontal,
  Ban,
  Trash2,
  UserCheck,
  UserX,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { ROLES, type Role } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/supabase/types";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MembersManagementProps {
  profile: Profile;
}

type SortField = "full_name" | "email" | "role" | "status" | "created_at";
type SortOrder = "asc" | "desc";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  approved: "Actif",
  rejected: "Rejeté",
  suspended: "Suspendu",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  suspended: "bg-orange-100 text-orange-800",
};

const ROLE_COLORS: Record<string, string> = {
  membre: "bg-slate-100 text-slate-800",
  ca: "bg-blue-100 text-blue-800",
  bureau: "bg-purple-100 text-purple-800",
};

const ROLE_ORDER: Record<string, number> = {
  membre: 0,
  ca: 1,
  bureau: 2,
};

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  approved: 1,
  suspended: 2,
  rejected: 3,
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function MembersManagement({ profile }: MembersManagementProps) {
  const supabase = createClient();
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("tous");
  const [statusFilter, setStatusFilter] = useState<string>("tous");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Delete confirmation dialog
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);

  // Pending role assignment (before approval)
  const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({});

  const isBureau = profile.role === "bureau";

  const fetchMembers = useCallback(async () => {
    setLoading(true);

    const { data, error } = await (supabase as any)
      .from("lcb_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement des membres.");
    } else if (data) {
      setMembers(data as Profile[]);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Filtered and sorted members
  const filteredMembers = useMemo(() => {
    let result = [...members];

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.full_name.toLowerCase().includes(searchLower) ||
          m.email.toLowerCase().includes(searchLower)
      );
    }

    if (roleFilter !== "tous") {
      result = result.filter((m) => m.role === roleFilter);
    }

    if (statusFilter !== "tous") {
      result = result.filter((m) => m.status === statusFilter);
    }

    result.sort((a, b) => {
      const dir = sortOrder === "asc" ? 1 : -1;

      switch (sortField) {
        case "full_name":
          return dir * a.full_name.localeCompare(b.full_name, "fr");
        case "email":
          return dir * a.email.localeCompare(b.email);
        case "role":
          return (
            dir *
            ((ROLE_ORDER[a.role] ?? 0) - (ROLE_ORDER[b.role] ?? 0))
          );
        case "status":
          return (
            dir *
            ((STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0))
          );
        case "created_at":
          return (
            dir *
            (new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime())
          );
        default:
          return 0;
      }
    });

    return result;
  }, [members, search, roleFilter, statusFilter, sortField, sortOrder]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  }

  async function handleAction(
    memberId: string,
    action: "approve" | "reject" | "suspend" | "delete" | "change_role",
    value?: string
  ) {
    setActionLoading(memberId);

    try {
      const res = await fetch("/api/admin/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, action, value }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Une erreur est survenue.");
      } else {
        toast.success(data.message);
        fetchMembers();
      }
    } catch {
      toast.error("Erreur de connexion au serveur.");
    } finally {
      setActionLoading(null);
      setDeleteTarget(null);
    }
  }

  // Stats
  const stats = useMemo(() => {
    const byRole: Record<string, number> = { membre: 0, ca: 0, bureau: 0 };
    const byStatus: Record<string, number> = {
      pending: 0,
      approved: 0,
      rejected: 0,
      suspended: 0,
    };

    for (const m of members) {
      if (byRole[m.role] !== undefined) byRole[m.role]++;
      if (byStatus[m.status] !== undefined) byStatus[m.status]++;
    }

    return { total: members.length, byRole, byStatus };
  }, [members]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Gestion des membres</h1>
        <p className="text-muted-foreground mt-1">
          Gérez les inscriptions, les rôles et les statuts des membres.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="gap-0 py-0">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-slate-500" />
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Actifs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-2">
              <UserCheck className="size-4 text-green-500" />
              <p className="text-2xl font-bold">{stats.byStatus.approved}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              En attente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-2">
              <Loader2 className="size-4 text-amber-500" />
              <p className="text-2xl font-bold">{stats.byStatus.pending}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Suspendus
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-2">
              <Ban className="size-4 text-orange-500" />
              <p className="text-2xl font-bold">{stats.byStatus.suspended}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Rôle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les rôles</SelectItem>
            {Object.entries(ROLES).map(([key, val]) => (
              <SelectItem key={key} value={key}>
                {val.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="approved">Actif</SelectItem>
            <SelectItem value="suspended">Suspendu</SelectItem>
            <SelectItem value="rejected">Rejeté</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Aucun membre trouvé</h3>
          <p className="text-muted-foreground mt-1">
            Aucun membre ne correspond aux critères de recherche.
          </p>
        </div>
      ) : (
        <Card className="gap-0 py-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => toggleSort("full_name")}
                        className="font-medium"
                      >
                        Nom
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => toggleSort("email")}
                        className="font-medium"
                      >
                        Email
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => toggleSort("role")}
                        className="font-medium"
                      >
                        Rôle
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => toggleSort("status")}
                        className="font-medium"
                      >
                        Statut
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => toggleSort("created_at")}
                        className="font-medium"
                      >
                        Inscription
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => {
                    const isLoading = actionLoading === member.id;
                    const isSelf = member.id === profile.id;

                    return (
                      <TableRow
                        key={member.id}
                        className={cn(
                          member.status === "pending" && "bg-amber-50/50",
                          member.status === "suspended" && "bg-orange-50/30",
                          member.status === "rejected" && "bg-red-50/30"
                        )}
                      >
                        {/* Avatar */}
                        <TableCell>
                          <Avatar className="size-8">
                            <AvatarImage
                              src={member.avatar_url ?? undefined}
                              alt={member.full_name}
                            />
                            <AvatarFallback className="bg-blue-100 text-blue-700 text-[10px]">
                              {getInitials(member.full_name)}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>

                        {/* Nom */}
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">
                              {member.full_name}
                              {isSelf && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  (vous)
                                </span>
                              )}
                            </p>
                            {member.boat_name && (
                              <p className="text-xs text-muted-foreground">
                                {member.boat_name}
                                {member.boat_type && ` (${member.boat_type})`}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        {/* Email */}
                        <TableCell className="text-sm text-muted-foreground">
                          {member.email}
                        </TableCell>

                        {/* Rôle */}
                        <TableCell>
                          {!isSelf ? (
                            member.status === "pending" ? (
                              <Select
                                value={pendingRoles[member.id] ?? member.role}
                                onValueChange={(val) =>
                                  setPendingRoles((prev) => ({ ...prev, [member.id]: val }))
                                }
                                disabled={isLoading}
                              >
                                <SelectTrigger className="h-7 w-[120px] text-xs">
                                  <Badge
                                    className={cn(
                                      "text-xs",
                                      ROLE_COLORS[pendingRoles[member.id] ?? member.role]
                                    )}
                                  >
                                    {ROLES[(pendingRoles[member.id] ?? member.role) as Role]?.label ??
                                      member.role}
                                  </Badge>
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(ROLES).map(([key, val]) => (
                                    <SelectItem key={key} value={key}>
                                      {val.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Select
                                value={member.role}
                                onValueChange={(val) =>
                                  handleAction(member.id, "change_role", val)
                                }
                                disabled={isLoading}
                              >
                                <SelectTrigger className="h-7 w-[120px] text-xs">
                                  <Badge
                                    className={cn(
                                      "text-xs",
                                      ROLE_COLORS[member.role]
                                    )}
                                  >
                                    {ROLES[member.role as Role]?.label ??
                                      member.role}
                                  </Badge>
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(ROLES).map(([key, val]) => (
                                    <SelectItem key={key} value={key}>
                                      {val.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )
                          ) : (
                            <Badge
                              className={cn(
                                "text-xs",
                                ROLE_COLORS[member.role]
                              )}
                            >
                              {ROLES[member.role as Role]?.label ?? member.role}
                            </Badge>
                          )}
                        </TableCell>

                        {/* Statut */}
                        <TableCell>
                          <Badge
                            className={cn(
                              "text-xs",
                              STATUS_COLORS[member.status]
                            )}
                          >
                            {STATUS_LABELS[member.status] ?? member.status}
                          </Badge>
                        </TableCell>

                        {/* Date inscription */}
                        <TableCell className="text-xs text-muted-foreground">
                          <span
                            title={format(
                              new Date(member.created_at),
                              "PPP",
                              { locale: fr }
                            )}
                          >
                            {formatDistanceToNow(
                              new Date(member.created_at),
                              { addSuffix: true, locale: fr }
                            )}
                          </span>
                        </TableCell>

                        {/* Actions */}
                        <TableCell>
                          {isLoading ? (
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                          ) : isSelf ? (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          ) : member.status === "pending" ? (
                            /* Pending: Approve / Reject */
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="xs"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() =>
                                  handleAction(member.id, "approve", pendingRoles[member.id])
                                }
                              >
                                <Check className="size-3.5" />
                                Activer
                              </Button>
                              <Button
                                variant="outline"
                                size="xs"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() =>
                                  handleAction(member.id, "reject")
                                }
                              >
                                <X className="size-3.5" />
                              </Button>
                            </div>
                          ) : (
                            /* All other statuses: dropdown menu */
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {/* Activate - show if not already approved */}
                                {member.status !== "approved" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleAction(member.id, "approve")
                                    }
                                    className="text-green-600 focus:text-green-700 focus:bg-green-50"
                                  >
                                    <UserCheck className="size-4" />
                                    Activer
                                  </DropdownMenuItem>
                                )}

                                {/* Suspend - show if approved */}
                                {member.status === "approved" &&
                                  isBureau && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleAction(member.id, "suspend")
                                      }
                                      className="text-orange-600 focus:text-orange-700 focus:bg-orange-50"
                                    >
                                      <Ban className="size-4" />
                                      Suspendre
                                    </DropdownMenuItem>
                                  )}

                                {/* Reinstate from suspended */}
                                {member.status === "suspended" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleAction(member.id, "approve")
                                    }
                                    className="text-green-600 focus:text-green-700 focus:bg-green-50"
                                  >
                                    <RotateCcw className="size-4" />
                                    Réactiver
                                  </DropdownMenuItem>
                                )}

                                {/* Reinstate from rejected */}
                                {member.status === "rejected" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleAction(member.id, "approve")
                                    }
                                    className="text-green-600 focus:text-green-700 focus:bg-green-50"
                                  >
                                    <RotateCcw className="size-4" />
                                    Réintégrer
                                  </DropdownMenuItem>
                                )}

                                {/* Delete - Bureau only */}
                                {isBureau && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setDeleteTarget(member)}
                                      className="text-red-600 focus:text-red-700 focus:bg-red-50"
                                    >
                                      <Trash2 className="size-4" />
                                      Supprimer
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Total count */}
      <p className="text-sm text-muted-foreground text-center">
        {filteredMembers.length} membre{filteredMembers.length > 1 ? "s" : ""}{" "}
        affiché{filteredMembers.length > 1 ? "s" : ""}
        {filteredMembers.length !== members.length &&
          ` sur ${members.length} au total`}
      </p>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce membre ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez supprimer définitivement le compte de{" "}
              <strong>{deleteTarget?.full_name}</strong> ({deleteTarget?.email}
              ). Cette action est irréversible. Toutes les données associées
              (posts, commentaires, messages) seront supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() =>
                deleteTarget && handleAction(deleteTarget.id, "delete")
              }
            >
              <Trash2 className="size-4" />
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
