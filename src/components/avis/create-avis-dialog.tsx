"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";
import { avisBatellerieSchema, type AvisBatellerieValues } from "@/lib/validators";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  FormDescription,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";

interface CreateAvisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  onCreated: () => void;
}

export function CreateAvisDialog({
  open,
  onOpenChange,
  profile,
  onCreated,
}: CreateAvisDialogProps) {
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const [fetchingWeather, setFetchingWeather] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<AvisBatellerieValues>({
    resolver: zodResolver(avisBatellerieSchema) as any,
    defaultValues: {
      title: "",
      content: "",
      sector: "",
      is_urgent: false,
      valid_until: "",
    },
  });

  async function fetchWeather(): Promise<Record<string, unknown> | null> {
    try {
      setFetchingWeather(true);
      // Paris coordinates par defaut - les coordonnees peuvent etre ajustees
      const res = await fetch("/api/weather?lat=48.8566&lon=2.3522");
      if (!res.ok) return null;
      const data = await res.json();
      return data;
    } catch {
      return null;
    } finally {
      setFetchingWeather(false);
    }
  }

  function onSubmit(values: AvisBatellerieValues) {
    startTransition(async () => {
      try {
        // Recuperer les donnees meteo
        const weatherData = await fetchWeather();

        // 1. Creer l'avis dans lcb_avis_batellerie
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: avisData, error: avisError } = await (supabase as any)
          .from("lcb_avis_batellerie")
          .insert({
            author_id: profile.id,
            title: values.title,
            content: values.content,
            sector: values.sector,
            is_urgent: values.is_urgent,
            valid_until: values.valid_until || null,
            weather_data: weatherData,
          })
          .select("id")
          .single();

        if (avisError || !avisData) {
          toast.error("Erreur lors de la création de l'avis.");
          return;
        }

        // 2. Creer le post lie dans lcb_posts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: postError } = await (supabase as any)
          .from("lcb_posts")
          .insert({
            author_id: profile.id,
            type: "avis_batellerie",
            title: values.title,
            content: values.content,
            photos: [],
            linked_avis_id: avisData.id,
          });

        if (postError) {
          console.error("Erreur lors de la création du post lié:", postError);
          toast.warning(
            "L'avis a été créé mais la publication liée n'a pas pu être ajoutée au fil."
          );
        } else {
          toast.success("Avis à la batellerie publié avec succès !");
        }

        // Reinitialiser le formulaire
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
          <DialogTitle>Publier un avis à la batellerie</DialogTitle>
          <DialogDescription>
            Publiez un avis officiel pour informer les membres. Les données
            météo seront automatiquement récupérées.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Titre */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Travaux écluse de Suresnes - Navigation restreinte"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contenu */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contenu</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrivez l'avis en détail..."
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Secteur */}
            <FormField
              control={form.control}
              name="sector"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secteur</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Seine aval - Bief de Suresnes"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Urgence */}
            <FormField
              control={form.control}
              name="is_urgent"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Avis urgent</FormLabel>
                    <FormDescription>
                      Les avis urgents sont mis en évidence avec un encadré
                      rouge et affichés en priorité.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Date de validite */}
            <FormField
              control={form.control}
              name="valid_until"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valide jusqu&apos;au (optionnel)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>
                    Date d&apos;expiration de l&apos;avis. Laissez vide pour un
                    avis sans limite de validité.
                  </FormDescription>
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
              <Button
                type="submit"
                disabled={isPending || fetchingWeather}
              >
                {isPending || fetchingWeather ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {fetchingWeather ? "Récupération météo..." : "Publication..."}
                  </>
                ) : (
                  "Publier l'avis"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
