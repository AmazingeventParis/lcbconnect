"use client";

import { useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";
import { COMPLAINT_PRIORITIES } from "@/lib/constants";
import { complaintSchema, type ComplaintValues } from "@/lib/validators";

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

interface CreateComplaintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  onCreated: () => void;
}

export function CreateComplaintDialog({
  open,
  onOpenChange,
  profile,
  onCreated,
}: CreateComplaintDialogProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [priority, setPriority] = useState<string>("normale");

  const form = useForm<ComplaintValues>({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      title: "",
      description: "",
      photos: [],
      location_name: "",
      latitude: undefined,
      longitude: undefined,
    },
  });

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const totalPhotos = photoUrls.length + files.length;
    if (totalPhotos > 10) {
      toast.error("Maximum 10 photos autorisées.");
      return;
    }

    setUploading(true);

    try {
      const newUrls: string[] = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`"${file.name}" n'est pas une image valide.`);
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          toast.error(`"${file.name}" dépasse la taille maximale de 5 Mo.`);
          continue;
        }

        const filePath = `complaints/${profile.id}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("lcb-photos")
          .upload(filePath, file, { cacheControl: "3600", upsert: false });

        if (uploadError) {
          toast.error(`Erreur lors du téléchargement de "${file.name}".`);
          continue;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("lcb-photos").getPublicUrl(filePath);

        newUrls.push(publicUrl);
      }

      const updated = [...photoUrls, ...newUrls];
      setPhotoUrls(updated);
      form.setValue("photos", updated);
    } catch {
      toast.error("Erreur lors du téléchargement des photos.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function removePhoto(index: number) {
    const updated = photoUrls.filter((_, i) => i !== index);
    setPhotoUrls(updated);
    form.setValue("photos", updated);
  }

  function onSubmit(values: ComplaintValues) {
    startTransition(async () => {
      try {
        const initialHistory = [
          {
            date: new Date().toISOString(),
            status: "soumise",
            changed_by: profile.full_name,
            note: "Plainte créée",
          },
        ];

        // 1. Create the complaint
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: complaintData, error: complaintError } = await (supabase as any)
          .from("lcb_complaints")
          .insert({
            author_id: profile.id,
            title: values.title,
            description: values.description,
            photos: values.photos ?? [],
            latitude: values.latitude ?? null,
            longitude: values.longitude ?? null,
            location_name: values.location_name || null,
            status: "soumise",
            priority: priority,
            history: initialHistory,
          })
          .select("id")
          .single();

        if (complaintError || !complaintData) {
          toast.error("Erreur lors de la création de la plainte.");
          return;
        }

        // 2. Create linked post in lcb_posts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: postError } = await (supabase as any)
          .from("lcb_posts")
          .insert({
            author_id: profile.id,
            type: "plainte",
            title: values.title,
            content: values.description,
            photos: values.photos ?? [],
            linked_complaint_id: complaintData.id,
          });

        if (postError) {
          console.error("Error creating linked post:", postError);
          toast.warning(
            "La plainte a été créée mais la publication liée n'a pas pu être ajoutée au fil."
          );
        } else {
          toast.success("Plainte créée avec succès !");
        }

        // Reset form
        form.reset();
        setPhotoUrls([]);
        setPriority("normale");
        onCreated();
      } catch {
        toast.error("Une erreur inattendue est survenue.");
      }
    });
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      form.reset();
      setPhotoUrls([]);
      setPriority("normale");
    }
    onOpenChange(newOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Signaler un problème</DialogTitle>
          <DialogDescription>
            Décrivez le problème rencontré. Votre signalement sera examiné par
            l&apos;administration.
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
                      placeholder="Ex: Borne électrique en panne au ponton B"
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
                      placeholder="Décrivez le problème en détail..."
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">Priorité</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionnez la priorité" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(COMPLAINT_PRIORITIES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      {val.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location Name */}
            <FormField
              control={form.control}
              name="location_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lieu (optionnel)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Ponton B, place 12"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude (optionnel)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="48.8566"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(
                            val === "" ? undefined : parseFloat(val)
                          );
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude (optionnel)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="2.3522"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(
                            val === "" ? undefined : parseFloat(val)
                          );
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Photos */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Photos (optionnel)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {photoUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative w-20 h-20 rounded-lg overflow-hidden border"
                  >
                    <img
                      src={url}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {photoUrls.length < 10 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ImagePlus className="h-5 w-5" />
                    )}
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground">
                Maximum 10 photos, 5 Mo par photo
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
              <Button type="submit" disabled={isPending || uploading}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  "Signaler"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
