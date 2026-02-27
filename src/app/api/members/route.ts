import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify current user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Check current user is approved
    const { data: callerProfile } = await supabase
      .from("lcb_profiles")
      .select("id, status")
      .eq("id", user.id)
      .single();

    if (!callerProfile || callerProfile.status !== "approved") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Get search param
    const search = request.nextUrl.searchParams.get("search") || "";

    // Fetch all approved members except current user
    let query = (supabase as any)
      .from("lcb_profiles")
      .select("id, full_name, role, status, boat_name, avatar_url")
      .eq("status", "approved")
      .neq("id", user.id)
      .order("full_name", { ascending: true })
      .limit(50);

    if (search.trim()) {
      query = query.ilike("full_name", `%${search.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Members fetch error:", error);
      return NextResponse.json(
        { error: "Erreur lors du chargement", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ members: data ?? [], count: (data ?? []).length });
  } catch (err) {
    console.error("Members API error:", err);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}
