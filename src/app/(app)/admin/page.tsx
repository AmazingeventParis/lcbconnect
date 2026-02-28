import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export default async function AdminPage() {
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

  // Fetch stats server-side
  const [
    { count: approvedCount },
    { count: pendingCount },
    { count: postsThisMonthCount },
    { count: upcomingEventsCount },
  ] = await Promise.all([
    (supabase as any)
      .from("lcb_profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
    (supabase as any)
      .from("lcb_profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    (supabase as any)
      .from("lcb_posts")
      .select("id", { count: "exact", head: true })
      .gte(
        "created_at",
        new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1
        ).toISOString()
      ),
    (supabase as any)
      .from("lcb_events")
      .select("id", { count: "exact", head: true })
      .gte("start_date", new Date().toISOString()),
  ]);

  const stats = {
    approvedMembers: approvedCount ?? 0,
    pendingMembers: pendingCount ?? 0,
    postsThisMonth: postsThisMonthCount ?? 0,
    upcomingEvents: upcomingEventsCount ?? 0,
  };

  return <AdminDashboard profile={profile} stats={stats} />;
}
