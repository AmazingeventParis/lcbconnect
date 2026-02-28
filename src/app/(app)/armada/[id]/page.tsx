import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MemberProfile } from "@/components/armada/member-profile";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MemberProfilePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: currentProfile } = await supabase
    .from("lcb_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!currentProfile) {
    redirect("/login");
  }

  const { data: memberProfile } = await supabase
    .from("lcb_profiles")
    .select("*")
    .eq("id", id)
    .eq("status", "approved")
    .single();

  if (!memberProfile) {
    notFound();
  }

  return (
    <MemberProfile
      profile={memberProfile}
      currentUserId={user.id}
    />
  );
}
