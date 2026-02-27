import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventsClient } from "@/components/events/events-client";

export default async function EventsPage() {
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

  return <EventsClient profile={profile} />;
}
