import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";
import { AdminDocuments } from "@/components/admin/admin-documents";

export default async function AdminDocumentsPage() {
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

  if (profile.role !== "ca" && profile.role !== "bureau") {
    redirect("/feed");
  }

  return <AdminDocuments profile={profile} />;
}
