import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";
import { ReportsManagement } from "@/components/admin/reports-management";

export default async function AdminReportsPage() {
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

  // Only CA/Bureau can access admin
  if (profile.role !== "ca" && profile.role !== "bureau") {
    redirect("/feed");
  }

  return <ReportsManagement profile={profile} />;
}
