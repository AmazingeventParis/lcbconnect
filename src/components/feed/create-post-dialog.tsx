"use client";

import { useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlusIcon, XIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { postSchema, type PostValues } from "@/lib/validators";
import type { Profile } from "@/lib/supabase/types";
import type { PostType } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  onPostCreated: () => void;
}

const POST_TYPE_OPTIONS: { value: PostType; label: string; minRole?: string }[] =
  [
    { value: "standard", label: "Publication" },
    { value: "service", label: "Service" },
    { value: "plainte", label: "Plainte" },
    { value: "officiel_bureau", label: "Communication officielle", minRole: "bureau" },
    { value: "avis_batellerie", label: "Avis à la batellerie", minRole: "bureau" },
  ];

export function CreatePostDialog({
  open,
  onOpenChange,
  profile,
  onPostCreated,
}: CreatePostDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const form = useForm<PostValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      type: "standard",
      title: "",
      content: "",
      photos: [],
    },
  });

  const availableTypes = POST_TYPE_OPTIONS.filter((opt) => {
    if (!opt.minRole) return true;
    if (opt.minRole === "bureau") return profile.role === "bureau";
    if (opt.minRole === "ca")
      return profile.role === "ca" || profile.role === "bureau";
    return true;
  });

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length === 0) return;

      const totalPhotos = photoFiles.length + files.length;
      if (totalPhotos > 10) {
        toast.error("Maximum 10 photos par publication");
        return;
      }

      const newFiles = [...photoFiles, ...files];
      setPhotoFiles(newFiles);

      // Generate previews
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setPhotoPreviews((prev) => [...prev, ev.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [photoFiles]
  );

  const removePhoto = useCallback(
    (index: number) => {
      setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
      setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
    },
    []
  );

  const uploadPhotos = useCallback(
    async (files: File[]): Promise<string[]> => {
      const urls: string[] = [];

      for (const file of files) {
        const ext = file.name.split(".").pop();
        const fileName = `${profile.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error } = await supabase.storage
          .from("lcb-photos")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (error) {
          console.error("Upload error:", error);
          throw new Error(`Erreur lors de l'envoi de ${file.name}`);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("lcb-photos").getPublicUrl(fileName);

        urls.push(publicUrl);
      }

      return urls;
    },
    [supabase, profile.id]
  );

  const onSubmit = useCallback(
    async (values: PostValues) => {
      setSubmitting(true);
      try {
        let photoUrls: string[] = [];

        if (photoFiles.length > 0) {
          setUploading(true);
          photoUrls = await uploadPhotos(photoFiles);
          setUploading(false);
        }

        const { error } = await supabase.from("lcb_posts").insert({
          author_id: profile.id,
          type: values.type,
          title: values.title || null,
          content: values.content,
          photos: photoUrls,
        });

        if (error) {
          throw error;
        }

        toast.success("Publication créée avec succès");
        form.reset();
        setPhotoFiles([]);
        setPhotoPreviews([]);
        onOpenChange(false);
        onPostCreated();
      } catch (err) {
        console.error("Error creating post:", err);
        toast.error("Erreur lors de la création de la publication");
      } finally {
        setSubmitting(false);
        setUploading(false);
      }
    },
    [photoFiles, uploadPhotos, supabase, profile.id, form, onOpenChange, onPostCreated]
  );

  const handleClose = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        form.reset();
        setPhotoFiles([]);
        setPhotoPreviews([]);
      }
      onOpenChange(isOpen);
    },
    [form, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer une publication</DialogTitle>
          <DialogDescription>
            Partagez avec la communauté
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de publication</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Type de publication" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Titre <span className="text-muted-foreground">(optionnel)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Titre de votre publication"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contenu</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Que souhaitez-vous partager ?"
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Photo upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Photos</label>
              <div className="flex flex-wrap gap-2">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="size-20 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full size-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removePhoto(index)}
                    >
                      <XIcon className="size-3" />
                    </button>
                  </div>
                ))}
                {photoFiles.length < 10 && (
                  <button
                    type="button"
                    className="size-20 flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-muted-foreground/25 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlusIcon className="size-5" />
                    <span className="text-[10px]">Ajouter</span>
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={submitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={submitting} className="rounded-full">
                {submitting ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    {uploading ? "Envoi des photos..." : "Publication..."}
                  </>
                ) : (
                  "Publier"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
