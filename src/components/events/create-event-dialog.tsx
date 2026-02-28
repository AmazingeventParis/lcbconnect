"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";
import { eventSchema, type EventValues } from "@/lib/validators";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  onCreated: () => void;
}

export function CreateEventDialog({
  open,
  onOpenChange,
  profile,
  onCreated,
}: CreateEventDialogProps) {
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const [maxParticipants, setMaxParticipants] = useState("");

  const form = useForm<EventValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      start_date: "",
      end_date: "",
      max_participants: undefined,
    },
  });

  function onSubmit(values: EventValues) {
    startTransition(async () => {
      try {
        const maxP = maxParticipants ? parseInt(maxParticipants, 10) : null;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("lcb_events")
          .insert({
            created_by: profile.id,
            title: values.title,
            description: values.description,
            location: values.location,
            start_date: new Date(values.start_date).toISOString(),
            end_date: new Date(values.end_date).toISOString(),
            max_participants: maxP,
            registrations_count: 0,
          });

        if (error) {
          toast.error("Erreur lors de la création de l'événement.");
          return;
        }

        toast.success("Événement créé avec succès !");
        form.reset();
        setMaxParticipants("");
        onCreated();
      } catch {
        toast.error("Une erreur inattendue est survenue.");
      }
    });
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      form.reset();
      setMaxParticipants("");
    }
    onOpenChange(newOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvel événement</DialogTitle>
          <DialogDescription>
            Créez un événement pour l&apos;association. Les membres pourront
            s&apos;y inscrire.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Sortie en mer du samedi"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrivez l'événement en détail..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lieu</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Port de plaisance, quai A"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Start Date */}
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date et heure de début</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* End Date */}
            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date et heure de fin</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Max Participants (managed outside react-hook-form since it's optional number) */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Nombre maximum de participants (optionnel)
              </label>
              <Input
                type="number"
                min="1"
                placeholder="Illimité si vide"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Laissez vide pour un nombre illimité de participants.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  "Créer l'événement"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
