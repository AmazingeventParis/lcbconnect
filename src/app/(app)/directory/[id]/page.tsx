import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DirectoryDetail } from "@/components/directory/directory-detail";

interface DirectoryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DirectoryDetailPage({
  params,
}: DirectoryDetailPageProps) {
  const { id } = await params;
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

  return <DirectoryDetail entryId={id} profile={profile} />;
}
