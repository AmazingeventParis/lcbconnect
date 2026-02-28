"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { sendNotification } from "@/lib/notify";
import type { Profile } from "@/lib/supabase/types";
import { directorySchema, type DirectoryValues } from "@/lib/validators";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { DIRECTORY_CATEGORIES } from "./directory-client";

interface CreateDirectoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  onCreated: () => void;
}

export function CreateDirectoryDialog({
  open,
  onOpenChange,
  profile,
  onCreated,
}: CreateDirectoryDialogProps) {
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  const form = useForm<DirectoryValues>({
    resolver: zodResolver(directorySchema),
    defaultValues: {
      name: "",
      category: "",
      description: "",
      phone: "",
      email: "",
      website: "",
      address: "",
    },
  });

  function onSubmit(values: DirectoryValues) {
    startTransition(async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: created, error } = await (supabase as any)
          .from("lcb_directory")
          .insert({
            created_by: profile.id,
            name: values.name,
            category: values.category,
            description: values.description,
            phone: values.phone || null,
            email: values.email || null,
            website: values.website || null,
            address: values.address || null,
            is_approved: false,
            rating_avg: 0,
            rating_count: 0,
          })
          .select("id")
          .single();

        if (error) {
          toast.error("Erreur lors de la création du prestataire.");
          return;
        }

        if (created) {
          sendNotification({
            type: "directory",
            actorId: profile.id,
            targetType: "directory",
            targetId: created.id,
          });
        }

        toast.success(
          "Prestataire proposé avec succès ! Il sera visible après approbation par le bureau."
        );
        form.reset();
        onCreated();
      } catch {
        toast.error("Une erreur inattendue est survenue.");
      }
    });
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Proposer un prestataire</DialogTitle>
          <DialogDescription>
            Recommandez un artisan ou prestataire. Il sera publié après
            validation par le bureau.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Martin Électricité Marine"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catégorie</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionnez une catégorie" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(DIRECTORY_CATEGORIES).map(
                        ([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
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
                      placeholder="Décrivez ce prestataire, ses spécialités, votre expérience..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone (optionnel)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: 01 23 45 67 89"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (optionnel)</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Ex: contact@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Website */}
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site web (optionnel)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: https://www.example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zone d'intervention (optionnel)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Île-de-France, Canal du Midi..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    Envoi...
                  </>
                ) : (
                  "Proposer"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
