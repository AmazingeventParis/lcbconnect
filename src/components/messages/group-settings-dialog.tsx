"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Camera, Loader2, Users, Shield, Landmark, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Conversation } from "@/lib/supabase/types";

interface GroupSettingsDialogProps {
  conversation: Conversation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (updated: Partial<Conversation>) => void;
}

function getGroupIcon(groupType: string | null) {
  switch (groupType) {
    case "ca":
      return <Shield className="size-6" />;
    case "bureau":
      return <Landmark className="size-6" />;
    case "channel":
      return <MessageSquare className="size-6" />;
    case "channel_ca":
      return <Shield className="size-6" />;
    default:
      return <Users className="size-6" />;
  }
}

export function GroupSettingsDialog({
  conversation,
  open,
  onOpenChange,
  onUpdated,
}: GroupSettingsDialogProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(conversation.avatar_url);
  const [name, setName] = useState(conversation.name || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Seules les images sont acceptées.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 2 Mo.");
      return;
    }

    setUploading(true);

    try {
      const filePath = `groups/${conversation.id}/avatar`;

      const { error: uploadError } = await supabase.storage
        .from("lcb-avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("lcb-avatars").getPublicUrl(filePath);

      const freshUrl = `${publicUrl}?t=${Date.now()}`;
      setAvatarUrl(freshUrl);
      toast.success("Image du groupe mise à jour.");
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error("Erreur lors du téléchargement de l'image.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        name: name.trim() || null,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await (supabase as any)
        .from("lcb_conversations")
        .update(updates)
        .eq("id", conversation.id);

      if (error) throw error;

      onUpdated({ name: updates.name as string | null, avatar_url: avatarUrl });
      toast.success("Groupe mis à jour.");
      onOpenChange(false);
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Paramètres du groupe</DialogTitle>
          <DialogDescription>
            Modifiez l&apos;avatar et le nom du groupe.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="size-24">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={name || "Groupe"} />
              ) : null}
              <AvatarFallback className="text-[#1E3A5F] bg-[#1E3A5F]/10">
                {getGroupIcon(conversation.group_type)}
              </AvatarFallback>
            </Avatar>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-colors hover:bg-primary/90 disabled:opacity-50"
              aria-label="Changer l'avatar du groupe"
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
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
            Cliquez pour changer la photo du groupe
          </p>
        </div>

        {/* Group name */}
        <div className="space-y-2">
          <Label htmlFor="group-name">Nom du groupe</Label>
          <Input
            id="group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du groupe"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              "Enregistrer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
