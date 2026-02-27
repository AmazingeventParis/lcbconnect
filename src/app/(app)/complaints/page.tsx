import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ComplaintsClient } from "@/components/complaints/complaints-client";

export default async function ComplaintsPage() {
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
    .single();

  if (!profile) {
    redirect("/login");
  }

  return <ComplaintsClient profile={profile} />;
}
