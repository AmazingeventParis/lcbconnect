import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { hasMinRole } from "@/lib/constants";

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("lcb_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !hasMinRole(profile.role, "bureau")) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { postId, action } = await request.json();

    if (!postId || !["hide", "unhide"].includes(action)) {
      return NextResponse.json(
        { error: "Paramètres invalides" },
        { status: 400 }
      );
    }

    const service = await createServiceClient();

    const { error } = await service
      .from("lcb_posts")
      .update({ is_hidden: action === "hide" })
      .eq("id", postId);

    if (error) {
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("lcb_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !hasMinRole(profile.role, "bureau")) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { postId } = await request.json();

    if (!postId) {
      return NextResponse.json(
        { error: "postId requis" },
        { status: 400 }
      );
    }

    const service = await createServiceClient();

    // Delete related data first (comments, likes, reports)
    await service.from("lcb_comments").delete().eq("post_id", postId);
    await service.from("lcb_likes").delete().eq("post_id", postId);
    await service.from("lcb_reports").delete().eq("post_id", postId);

    const { error } = await service
      .from("lcb_posts")
      .delete()
      .eq("id", postId);

    if (error) {
      return NextResponse.json(
        { error: "Erreur lors de la suppression" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
