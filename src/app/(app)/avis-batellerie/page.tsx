import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AvisClient } from "@/components/avis/avis-client";

export default async function AvisBatelleriePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <AvisClient />;
}
