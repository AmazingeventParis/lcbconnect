import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";
import { MembersManagement } from "@/components/admin/members-management";

export default async function AdminMembersPage() {
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

  return <MembersManagement profile={profile} />;
}
