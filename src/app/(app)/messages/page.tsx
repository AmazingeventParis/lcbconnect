import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MessagesClient } from "@/components/messages/messages-client";

export default async function MessagesPage() {
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

  return <MessagesClient profile={profile} />;
}
