"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Service } from "@/lib/supabase/types";
import {
  SERVICE_CATEGORIES,
  SERVICE_STATUSES,
  type ServiceCategory,
  type ServiceStatus,
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
import { ServiceCard } from "./service-card";
import { CreateServiceDialog } from "./create-service-dialog";

type ServiceWithAuthor = Service & {
  author: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
};

interface ServicesClientProps {
  profile: Profile;
}

export function ServicesClient({ profile }: ServicesClientProps) {
  const supabase = createClient();
  const [services, setServices] = useState<ServiceWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("tous");
  const [categoryFilter, setCategoryFilter] = useState<string>("toutes");
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchServices = useCallback(async () => {
    setLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from("lcb_services")
      .select("*, author:lcb_profiles!author_id(id, full_name, avatar_url)")
      .order("created_at", { ascending: false });

    if (statusFilter !== "tous") {
      query = query.eq("status", statusFilter);
    }

    if (categoryFilter !== "toutes") {
      query = query.eq("category", categoryFilter);
    }

    const { data, error } = await query;

    if (!error && data) {
      setServices(data as ServiceWithAuthor[]);
    }

    setLoading(false);
  }, [supabase, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  function handleCreated() {
    setDialogOpen(false);
    fetchServices();
  }

  const filteredServices = services;

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Demandes de service</h1>
          <p className="text-muted-foreground mt-1">
            Demandez de l&apos;aide ou proposez vos services aux autres membres.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Créer une demande
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
            {Object.entries(SERVICE_STATUSES).map(([key, val]) => (
              <TabsTrigger key={key} value={key}>
                {val.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Invisible content areas to satisfy radix tabs structure */}
          <TabsContent value="tous" className="mt-0" />
          {Object.keys(SERVICE_STATUSES).map((key) => (
            <TabsContent key={key} value={key} className="mt-0" />
          ))}
        </Tabs>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="toutes">Toutes les catégories</SelectItem>
            {Object.entries(SERVICE_CATEGORIES).map(([key, val]) => (
              <SelectItem key={key} value={key}>
                {val.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Service List */}
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
      ) : filteredServices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Wrench className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">
            Aucune demande de service
          </h3>
          <p className="text-muted-foreground mt-1 max-w-md">
            Il n&apos;y a pas encore de demande de service
            {statusFilter !== "tous" &&
              ` avec le statut "${SERVICE_STATUSES[statusFilter as ServiceStatus]?.label}"`}
            {categoryFilter !== "toutes" &&
              ` dans la catégorie "${SERVICE_CATEGORIES[categoryFilter as ServiceCategory]?.label}"`}
            . Soyez le premier à en créer une !
          </p>
          <Button onClick={() => setDialogOpen(true)} className="mt-4">
            <Plus className="h-4 w-4" />
            Créer une demande
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredServices.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CreateServiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        profile={profile}
        onCreated={handleCreated}
      />
    </div>
  );
}
