import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CarteClient } from "@/components/carte/carte-client";

export default async function CartePage() {
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

  return <CarteClient />;
}
