"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Complaint } from "@/lib/supabase/types";
import {
  COMPLAINT_STATUSES,
  COMPLAINT_PRIORITIES,
  type ComplaintStatus,
  type ComplaintPriority,
} from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ComplaintCard } from "./complaint-card";
import { CreateComplaintDialog } from "./create-complaint-dialog";

type ComplaintWithAuthor = Complaint & {
  author: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
};

interface ComplaintsClientProps {
  profile: Profile;
}

export function ComplaintsClient({ profile }: ComplaintsClientProps) {
  const supabase = createClient();
  const [complaints, setComplaints] = useState<ComplaintWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("tous");
  const [priorityFilter, setPriorityFilter] = useState<string>("toutes");
  const [dialogOpen, setDialogOpen] = useState(false);

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

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  function handleCreated() {
    setDialogOpen(false);
    fetchComplaints();
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Plaintes et signalements</h1>
          <p className="text-muted-foreground mt-1">
            Signalez un problème ou suivez les plaintes en cours.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Signaler un problème
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Tabs
          value={statusFilter}
          onValueChange={setStatusFilter}
          className="flex-1"
        >
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="tous">Tous</TabsTrigger>
            {Object.entries(COMPLAINT_STATUSES).map(([key, val]) => (
              <TabsTrigger key={key} value={key}>
                {val.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="tous" className="mt-0" />
          {Object.keys(COMPLAINT_STATUSES).map((key) => (
            <TabsContent key={key} value={key} className="mt-0" />
          ))}
        </Tabs>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
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

      {/* Complaint List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border p-6 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : complaints.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Aucune plainte signalée</h3>
          <p className="text-muted-foreground mt-1 max-w-md">
            Il n&apos;y a pas encore de plainte
            {statusFilter !== "tous" &&
              ` avec le statut "${COMPLAINT_STATUSES[statusFilter as ComplaintStatus]?.label}"`}
            {priorityFilter !== "toutes" &&
              ` de priorité "${COMPLAINT_PRIORITIES[priorityFilter as ComplaintPriority]?.label}"`}
            . Tout semble en ordre !
          </p>
          <Button onClick={() => setDialogOpen(true)} className="mt-4">
            <Plus className="h-4 w-4" />
            Signaler un problème
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {complaints.map((complaint) => (
            <ComplaintCard key={complaint.id} complaint={complaint} />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CreateComplaintDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        profile={profile}
        onCreated={handleCreated}
      />
    </div>
  );
}
