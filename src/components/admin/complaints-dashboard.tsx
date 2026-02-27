"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, ArrowUpDown, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { Profile, Complaint } from "@/lib/supabase/types";
import {
  COMPLAINT_STATUSES,
  COMPLAINT_PRIORITIES,
  type ComplaintStatus,
  type ComplaintPriority,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type ComplaintWithAuthor = Complaint & {
  author: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
};

interface ComplaintsDashboardProps {
  profile: Profile;
}

const STATUS_COLORS: Record<string, string> = {
  soumise: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  en_cours:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  resolue: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejetee: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const PRIORITY_COLORS: Record<string, string> = {
  basse: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  normale: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  haute: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  urgente: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

type SortField = "created_at" | "priority" | "status";
type SortOrder = "asc" | "desc";

const PRIORITY_ORDER: Record<string, number> = {
  basse: 0,
  normale: 1,
  haute: 2,
  urgente: 3,
};

const STATUS_ORDER: Record<string, number> = {
  soumise: 0,
  en_cours: 1,
  resolue: 2,
  rejetee: 3,
};

export function ComplaintsDashboard({ profile }: ComplaintsDashboardProps) {
  const supabase = createClient();
  const [complaints, setComplaints] = useState<ComplaintWithAuthor[]>([]);
  const [members, setMembers] = useState<
    Pick<Profile, "id" | "full_name">[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("tous");
  const [priorityFilter, setPriorityFilter] = useState<string>("toutes");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const fetchComplaints = useCallback(async () => {
    setLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from("lcb_complaints")
      .select("*, author:lcb_profiles!author_id(id, full_name, avatar_url)")
      .order("created_at", { ascending: false });

    if (statusFilter !== "tous") {
      query = query.eq("status", statusFilter);
    }

    if (priorityFilter !== "toutes") {
      query = query.eq("priority", priorityFilter);
    }

    const { data, error } = await query;

    if (!error && data) {
      setComplaints(data as ComplaintWithAuthor[]);
    }

    setLoading(false);
  }, [supabase, statusFilter, priorityFilter]);

  const fetchMembers = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("lcb_profiles")
      .select("id, full_name")
      .eq("status", "approved")
      .order("full_name");

    if (data) {
      setMembers(data);
    }
  }, [supabase]);

  useEffect(() => {
    fetchComplaints();
    fetchMembers();
  }, [fetchComplaints, fetchMembers]);

  // Sort complaints client-side
  const sortedComplaints = [...complaints].sort((a, b) => {
    const dir = sortOrder === "asc" ? 1 : -1;

    if (sortField === "created_at") {
      return (
        dir *
        (new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      );
    }

    if (sortField === "priority") {
      return (
        dir *
        ((PRIORITY_ORDER[a.priority] ?? 1) -
          (PRIORITY_ORDER[b.priority] ?? 1))
      );
    }

    if (sortField === "status") {
      return (
        dir *
        ((STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0))
      );
    }

    return 0;
  });

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  }

  async function handleQuickStatusChange(
    complaintId: string,
    newStatus: string
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const complaint = complaints.find((c) => c.id === complaintId);
    if (!complaint) return;

    const currentHistory = Array.isArray(complaint.history)
      ? complaint.history
      : [];
    const newEntry = {
      date: new Date().toISOString(),
      status: newStatus,
      changed_by: profile.full_name,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("lcb_complaints")
      .update({
        status: newStatus,
        history: [...(currentHistory as unknown[]), newEntry],
        updated_at: new Date().toISOString(),
      })
      .eq("id", complaintId);

    if (error) {
      toast.error("Erreur lors de la mise à jour.");
    } else {
      toast.success("Statut mis à jour.");
      fetchComplaints();
    }
  }

  async function handleQuickPriorityChange(
    complaintId: string,
    newPriority: string
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("lcb_complaints")
      .update({
        priority: newPriority,
        updated_at: new Date().toISOString(),
      })
      .eq("id", complaintId);

    if (error) {
      toast.error("Erreur lors de la mise à jour.");
    } else {
      toast.success("Priorité mise à jour.");
      fetchComplaints();
    }
  }

  async function handleQuickAssign(complaintId: string, userId: string) {
    const assignValue = userId === "non_assigne" ? null : userId;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("lcb_complaints")
      .update({
        assigned_to: assignValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", complaintId);

    if (error) {
      toast.error("Erreur lors de l'assignation.");
    } else {
      toast.success("Assignation mise à jour.");
      fetchComplaints();
    }
  }

  // Stats
  const stats = {
    total: complaints.length,
    byStatus: Object.keys(COMPLAINT_STATUSES).reduce(
      (acc, status) => {
        acc[status] = complaints.filter((c) => c.status === status).length;
        return acc;
      },
      {} as Record<string, number>
    ),
    byPriority: Object.keys(COMPLAINT_PRIORITIES).reduce(
      (acc, priority) => {
        acc[priority] = complaints.filter(
          (c) => c.priority === priority
        ).length;
        return acc;
      },
      {} as Record<string, number>
    ),
  };

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
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord des plaintes</h1>
        <p className="text-muted-foreground mt-1">
          Gérez et suivez toutes les plaintes des membres.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        {/* Total */}
        <Card className="gap-0 py-0">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>

        {/* By Status */}
        {Object.entries(COMPLAINT_STATUSES).map(([key, val]) => (
          <Card key={key} className="gap-0 py-0">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {val.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">
                  {stats.byStatus[key] ?? 0}
                </p>
                <Badge
                  className={cn("text-xs", STATUS_COLORS[key])}
                >
                  {val.label}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Priority Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Object.entries(COMPLAINT_PRIORITIES).map(([key, val]) => (
          <Card key={key} className="gap-0 py-0">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Priorité {val.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">
                  {stats.byPriority[key] ?? 0}
                </p>
                <Badge
                  className={cn("text-xs", PRIORITY_COLORS[key])}
                >
                  {val.label}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            {Object.entries(COMPLAINT_STATUSES).map(([key, val]) => (
              <SelectItem key={key} value={key}>
                {val.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="toutes">Toutes les priorités</SelectItem>
            {Object.entries(COMPLAINT_PRIORITIES).map(([key, val]) => (
              <SelectItem key={key} value={key}>
                {val.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {sortedComplaints.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Aucune plainte trouvée</h3>
          <p className="text-muted-foreground mt-1">
            Aucune plainte ne correspond aux filtres sélectionnés.
          </p>
        </div>
      ) : (
        <Card className="gap-0 py-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Auteur</TableHead>
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
                      onClick={() => toggleSort("priority")}
                      className="font-medium"
                    >
                      Priorité
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Assigné à</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => toggleSort("created_at")}
                      className="font-medium"
                    >
                      Date
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedComplaints.map((complaint) => {
                  const statusInfo =
                    COMPLAINT_STATUSES[
                      complaint.status as ComplaintStatus
                    ];
                  const priorityInfo =
                    COMPLAINT_PRIORITIES[
                      complaint.priority as ComplaintPriority
                    ];

                  return (
                    <TableRow key={complaint.id}>
                      <TableCell className="max-w-[200px]">
                        <p className="font-medium text-sm truncate">
                          {complaint.title}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {complaint.author?.full_name ?? "Inconnu"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={complaint.status}
                          onValueChange={(val) =>
                            handleQuickStatusChange(complaint.id, val)
                          }
                        >
                          <SelectTrigger className="h-7 w-[130px] text-xs">
                            <Badge
                              className={cn(
                                "text-xs",
                                STATUS_COLORS[complaint.status]
                              )}
                            >
                              {statusInfo?.label ?? complaint.status}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(COMPLAINT_STATUSES).map(
                              ([key, val]) => (
                                <SelectItem key={key} value={key}>
                                  {val.label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={complaint.priority}
                          onValueChange={(val) =>
                            handleQuickPriorityChange(complaint.id, val)
                          }
                        >
                          <SelectTrigger className="h-7 w-[120px] text-xs">
                            <Badge
                              className={cn(
                                "text-xs",
                                PRIORITY_COLORS[complaint.priority]
                              )}
                            >
                              {priorityInfo?.label ?? complaint.priority}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(COMPLAINT_PRIORITIES).map(
                              ([key, val]) => (
                                <SelectItem key={key} value={key}>
                                  {val.label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={complaint.assigned_to ?? "non_assigne"}
                          onValueChange={(val) =>
                            handleQuickAssign(complaint.id, val)
                          }
                        >
                          <SelectTrigger className="h-7 w-[150px] text-xs">
                            <SelectValue placeholder="Non assigné" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="non_assigne">
                              Non assigné
                            </SelectItem>
                            {members.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(
                          new Date(complaint.created_at),
                          {
                            addSuffix: true,
                            locale: fr,
                          }
                        )}
                      </TableCell>
                      <TableCell>
                        <Link href={`/complaints/${complaint.id}`}>
                          <Button variant="ghost" size="icon-xs">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
