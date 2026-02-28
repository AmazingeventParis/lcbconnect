"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowUpDown,
  CheckCircle,
  Flag,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Profile, Report, Post, Comment } from "@/lib/supabase/types";

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

type ReportWithDetails = Report & {
  reporter: Pick<Profile, "id" | "full_name"> | null;
  post: Pick<Post, "id" | "content" | "title"> | null;
  comment: Pick<Comment, "id" | "content" | "post_id"> | null;
};

interface ReportsManagementProps {
  profile: Profile;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  reviewed: "Autorisé",
  dismissed: "Classé",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  reviewed: "bg-green-100 text-green-800",
  dismissed: "bg-slate-100 text-slate-800",
};

type SortField = "created_at" | "status";
type SortOrder = "asc" | "desc";

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  reviewed: 1,
  dismissed: 2,
};

export function ReportsManagement({ profile }: ReportsManagementProps) {
  const supabase = createClient();
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("tous");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const fetchReports = useCallback(async () => {
    setLoading(true);

    const { data, error } = await (supabase as any)
      .from("lcb_reports")
      .select(
        "*, reporter:lcb_profiles!reporter_id(id, full_name), post:lcb_posts!post_id(id, content, title), comment:lcb_comments!comment_id(id, content, post_id)"
      )
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement des signalements.");
    } else if (data) {
      setReports(data as ReportWithDetails[]);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    let result = [...reports];

    if (statusFilter !== "tous") {
      result = result.filter((r) => r.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      const dir = sortOrder === "asc" ? 1 : -1;

      if (sortField === "created_at") {
        return (
          dir *
          (new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime())
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

    return result;
  }, [reports, statusFilter, sortField, sortOrder]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  }

  async function handleUpdateStatus(reportId: string, newStatus: string) {
    setActionLoading(reportId);

    const { error } = await (supabase as any)
      .from("lcb_reports")
      .update({
        status: newStatus,
        reviewed_by: profile.id,
      })
      .eq("id", reportId);

    if (error) {
      toast.error("Erreur lors de la mise à jour du signalement.");
    } else {
      toast.success(
        newStatus === "reviewed"
          ? "Publication autorisée."
          : "Signalement classé sans suite."
      );
      fetchReports();
    }

    setActionLoading(null);
  }

  async function handleHidePost(reportId: string, postId: string) {
    setActionLoading(reportId);

    const res = await fetch("/api/admin/posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, action: "hide" }),
    });

    if (!res.ok) {
      toast.error("Erreur lors de la suspension du post.");
    } else {
      toast.success("Publication suspendue (masquée du fil).");
      // Also mark report as reviewed
      await (supabase as any)
        .from("lcb_reports")
        .update({ status: "reviewed", reviewed_by: profile.id })
        .eq("id", reportId);
      fetchReports();
    }

    setActionLoading(null);
  }

  async function handleDeletePost(reportId: string, postId: string) {
    if (!confirm("Supprimer définitivement cette publication et toutes ses données associées ?")) {
      return;
    }

    setActionLoading(reportId);

    const res = await fetch("/api/admin/posts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    });

    if (!res.ok) {
      toast.error("Erreur lors de la suppression du post.");
    } else {
      toast.success("Publication supprimée définitivement.");
      fetchReports();
    }

    setActionLoading(null);
  }

  async function handleDeleteReport(reportId: string) {
    if (!confirm("Supprimer ce signalement ?")) return;

    setActionLoading(reportId);

    const { error } = await (supabase as any)
      .from("lcb_reports")
      .delete()
      .eq("id", reportId);

    if (error) {
      toast.error("Erreur lors de la suppression du signalement.");
    } else {
      toast.success("Signalement supprimé.");
      fetchReports();
    }

    setActionLoading(null);
  }

  // Stats
  const stats = useMemo(() => {
    return {
      total: reports.length,
      pending: reports.filter((r) => r.status === "pending").length,
      reviewed: reports.filter((r) => r.status === "reviewed").length,
      dismissed: reports.filter((r) => r.status === "dismissed").length,
    };
  }, [reports]);

  function getContentLink(report: ReportWithDetails): string | null {
    if (report.post_id) {
      return `/feed/${report.post_id}`;
    }
    if (report.comment && report.comment.post_id) {
      return `/feed/${report.comment.post_id}`;
    }
    return null;
  }

  function getContentPreview(report: ReportWithDetails): string {
    if (report.post) {
      const content = report.post.title || report.post.content;
      return content.length > 80 ? content.slice(0, 80) + "..." : content;
    }
    if (report.comment) {
      const content = report.comment.content;
      return content.length > 80 ? content.slice(0, 80) + "..." : content;
    }
    return "Contenu supprimé";
  }

  function getContentType(report: ReportWithDetails): string {
    if (report.post_id) return "Publication";
    if (report.comment_id) return "Commentaire";
    return "Inconnu";
  }

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
        <h1 className="text-2xl font-bold">Modération de contenu</h1>
        <p className="text-muted-foreground mt-1">
          Gérez les signalements de publications et de commentaires.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="gap-0 py-0">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total signalements
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold">{stats.total}</p>
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
              <p className="text-2xl font-bold">{stats.pending}</p>
              {stats.pending > 0 && (
                <Badge className="bg-amber-100 text-amber-800 text-xs">
                  À traiter
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="gap-0 py-0">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Autorisés
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold">{stats.reviewed}</p>
          </CardContent>
        </Card>
        <Card className="gap-0 py-0">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Classés
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold">{stats.dismissed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="reviewed">Autorisé</SelectItem>
            <SelectItem value="dismissed">Classé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Flag className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Aucun signalement</h3>
          <p className="text-muted-foreground mt-1">
            {statusFilter !== "tous"
              ? "Aucun signalement ne correspond au filtre sélectionné."
              : "Aucun contenu n'a été signalé pour le moment."}
          </p>
        </div>
      ) : (
        <Card className="gap-0 py-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Contenu signalé</TableHead>
                    <TableHead>Signalé par</TableHead>
                    <TableHead>Motif</TableHead>
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
                        Date
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => {
                    const isLoading = actionLoading === report.id;
                    const contentLink = getContentLink(report);

                    return (
                      <TableRow
                        key={report.id}
                        className={cn(
                          report.status === "pending" && "bg-amber-50/30"
                        )}
                      >
                        {/* Type */}
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {getContentType(report)}
                          </Badge>
                        </TableCell>

                        {/* Content preview */}
                        <TableCell className="max-w-[250px]">
                          <p className="text-sm text-muted-foreground truncate">
                            {getContentPreview(report)}
                          </p>
                        </TableCell>

                        {/* Reporter */}
                        <TableCell className="text-sm text-muted-foreground">
                          {report.reporter?.full_name ?? "Inconnu"}
                        </TableCell>

                        {/* Reason */}
                        <TableCell className="max-w-[200px]">
                          <p className="text-sm text-muted-foreground truncate">
                            {report.reason}
                          </p>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge
                            className={cn(
                              "text-xs",
                              STATUS_COLORS[report.status]
                            )}
                          >
                            {STATUS_LABELS[report.status] ?? report.status}
                          </Badge>
                        </TableCell>

                        {/* Date */}
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNow(
                            new Date(report.created_at),
                            {
                              addSuffix: true,
                              locale: fr,
                            }
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell>
                          {isLoading ? (
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                          ) : (
                            <div className="flex items-center gap-1">
                              {contentLink && (
                                <Link href={contentLink}>
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    title="Voir la publication"
                                  >
                                    <Eye className="size-3.5" />
                                    Voir
                                  </Button>
                                </Link>
                              )}

                              {report.status === "pending" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() =>
                                      handleUpdateStatus(
                                        report.id,
                                        "reviewed"
                                      )
                                    }
                                    title="Autoriser la publication"
                                  >
                                    <CheckCircle className="size-3.5" />
                                    Autoriser
                                  </Button>
                                  {report.post_id && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="xs"
                                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                        onClick={() =>
                                          handleHidePost(
                                            report.id,
                                            report.post_id!
                                          )
                                        }
                                        title="Suspendre (masquer du fil)"
                                      >
                                        <EyeOff className="size-3.5" />
                                        Suspendre
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="xs"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() =>
                                          handleDeletePost(
                                            report.id,
                                            report.post_id!
                                          )
                                        }
                                        title="Supprimer définitivement"
                                      >
                                        <Trash2 className="size-3.5" />
                                        Supprimer
                                      </Button>
                                    </>
                                  )}
                                </>
                              )}

                              {report.status !== "pending" && (
                                <Button
                                  variant="outline"
                                  size="xs"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteReport(report.id)}
                                  title="Supprimer le signalement"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              )}
                            </div>
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

      {/* Count */}
      <p className="text-sm text-muted-foreground text-center">
        {filteredReports.length} signalement
        {filteredReports.length > 1 ? "s" : ""} affiché
        {filteredReports.length > 1 ? "s" : ""}
        {filteredReports.length !== reports.length &&
          ` sur ${reports.length} au total`}
      </p>
    </div>
  );
}
