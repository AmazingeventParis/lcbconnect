import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";
import { ComplaintsDashboard } from "@/components/admin/complaints-dashboard";

export default async function AdminComplaintsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("lcb_profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) {
    redirect("/login");
  }

  // Extra guard: only CA/Bureau can access
  if (profile.role !== "ca" && profile.role !== "bureau") {
    redirect("/feed");
  }

  return <ComplaintsDashboard profile={profile} />;
}
