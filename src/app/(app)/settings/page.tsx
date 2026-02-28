import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile/profile-form";
import { NotificationSettings } from "@/components/settings/notification-settings";
import type { NotificationPrefs } from "@/lib/supabase/types";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from("lcb_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Réglages</h1>
      <p className="text-muted-foreground mt-1 mb-8">
        Modifiez vos informations personnelles et votre avatar.
      </p>

      <ProfileForm profile={profile} />

      <div className="mt-12 border-t border-border pt-8">
        <NotificationSettings
          profileId={profile.id}
          initialPrefs={(profile.notification_prefs as NotificationPrefs) ?? null}
          role={profile.role}
        />
      </div>
    </div>
  );
}
