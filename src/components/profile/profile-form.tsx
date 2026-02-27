"use client";

import { useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { Profile, ProfileUpdate } from "@/lib/supabase/types";
import { profileSchema, type ProfileValues } from "@/lib/validators";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface ProfileFormProps {
  profile: Profile;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    profile.avatar_url
  );
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile.full_name ?? "",
      boat_name: profile.boat_name ?? "",
      boat_type: profile.boat_type ?? "",
      mooring_port: profile.mooring_port ?? "",
      phone: profile.phone ?? "",
      bio: profile.bio ?? "",
    },
  });

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  async function handleAvatarUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image.");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 2 Mo.");
      return;
    }

    setUploading(true);

    try {
      const filePath = `${profile.id}/avatar`;

      const { error: uploadError } = await supabase.storage
        .from("lcb-avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("lcb-avatars").getPublicUrl(filePath);

      // Append timestamp to bust cache
      const freshUrl = `${publicUrl}?t=${Date.now()}`;

      // Update profile with new avatar URL
      const avatarUpdate: ProfileUpdate = {
        avatar_url: freshUrl,
        updated_at: new Date().toISOString(),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from("lcb_profiles")
        .update(avatarUpdate)
        .eq("id", profile.id);

      if (updateError) {
        throw updateError;
      }

      setAvatarUrl(freshUrl);
      toast.success("Avatar mis à jour avec succès.");
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error("Erreur lors du téléchargement de l'avatar.");
    } finally {
      setUploading(false);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function onSubmit(values: ProfileValues) {
    startTransition(async () => {
      const profileUpdate: ProfileUpdate = {
        full_name: values.full_name,
        boat_name: values.boat_name || null,
        boat_type: values.boat_type || null,
        mooring_port: values.mooring_port || null,
        phone: values.phone || null,
        bio: values.bio || null,
        updated_at: new Date().toISOString(),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("lcb_profiles")
        .update(profileUpdate)
        .eq("id", profile.id);

      if (error) {
        console.error("Profile update error:", error);
        toast.error("Erreur lors de la mise à jour du profil.");
        return;
      }

      toast.success("Profil mis à jour avec succès.");
    });
  }

  return (
    <div className="space-y-8">
      {/* ── Avatar Section ──────────────────────────────────── */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Avatar className="h-24 w-24">
            <AvatarImage
              src={avatarUrl ?? undefined}
              alt={profile.full_name}
            />
            <AvatarFallback className="text-lg">
              {getInitials(profile.full_name)}
            </AvatarFallback>
          </Avatar>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-colors hover:bg-primary/90 disabled:opacity-50"
            aria-label="Changer l'avatar"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
            aria-hidden="true"
          />
        </div>

        <p className="text-sm text-muted-foreground">
          Cliquez sur l&apos;icône pour changer votre photo
        </p>
      </div>

      {/* ── Profile Form ────────────────────────────────────── */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom complet</FormLabel>
                <FormControl>
                  <Input placeholder="Jean Dupont" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="boat_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom du bateau</FormLabel>
                <FormControl>
                  <Input placeholder="L'Aventurier" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="boat_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type de bateau</FormLabel>
                <FormControl>
                  <Input placeholder="Voilier, Péniche, Vedette..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mooring_port"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Port d&apos;attache</FormLabel>
                <FormControl>
                  <Input placeholder="Port de plaisance de..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Téléphone</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="06 12 34 56 78"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Biographie</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Parlez-nous de vous..."
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              "Enregistrer les modifications"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
