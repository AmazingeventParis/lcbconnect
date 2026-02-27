import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { hasMinRole, type Role } from "@/lib/constants";

export async function PATCH(request: NextRequest) {
  try {
    // Verify the calling user is authorized (CA or Bureau)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const { data: callerProfile } = await supabase
      .from("lcb_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!callerProfile || !hasMinRole(callerProfile.role, "ca")) {
      return NextResponse.json(
        { error: "Accès refusé. Rôle CA ou Bureau requis." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { memberId, action, value } = body;

    if (!memberId || !action) {
      return NextResponse.json(
        { error: "Paramètres manquants" },
        { status: 400 }
      );
    }

    // Prevent self-modification for destructive actions
    if (memberId === user.id && ["suspend", "delete", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas effectuer cette action sur votre propre compte." },
        { status: 400 }
      );
    }

    // Use service role client for admin operations
    const serviceClient = await createServiceClient();

    switch (action) {
      case "approve": {
        const { error } = await (serviceClient as any)
          .from("lcb_profiles")
          .update({ status: "approved", updated_at: new Date().toISOString() })
          .eq("id", memberId);

        if (error) {
          return NextResponse.json(
            { error: "Erreur lors de l'approbation: " + error.message },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, message: "Membre activé" });
      }

      case "reject": {
        const { error } = await (serviceClient as any)
          .from("lcb_profiles")
          .update({ status: "rejected", updated_at: new Date().toISOString() })
          .eq("id", memberId);

        if (error) {
          return NextResponse.json(
            { error: "Erreur lors du rejet: " + error.message },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, message: "Membre rejeté" });
      }

      case "suspend": {
        // Only Bureau can suspend
        if (callerProfile.role !== "bureau") {
          return NextResponse.json(
            { error: "Seul le Bureau peut suspendre un membre." },
            { status: 403 }
          );
        }

        const { error } = await (serviceClient as any)
          .from("lcb_profiles")
          .update({ status: "suspended", updated_at: new Date().toISOString() })
          .eq("id", memberId);

        if (error) {
          return NextResponse.json(
            { error: "Erreur lors de la suspension: " + error.message },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, message: "Membre suspendu" });
      }

      case "delete": {
        // Only Bureau can delete
        if (callerProfile.role !== "bureau") {
          return NextResponse.json(
            { error: "Seul le Bureau peut supprimer un membre." },
            { status: 403 }
          );
        }

        // Delete from auth.users (cascades to lcb_profiles)
        const { error } = await serviceClient.auth.admin.deleteUser(memberId);

        if (error) {
          return NextResponse.json(
            { error: "Erreur lors de la suppression: " + error.message },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, message: "Membre supprimé définitivement" });
      }

      case "change_role": {
        // Only Bureau can change roles
        if (callerProfile.role !== "bureau") {
          return NextResponse.json(
            { error: "Seul le Bureau peut modifier les rôles." },
            { status: 403 }
          );
        }

        const validRoles: Role[] = ["membre", "ca", "bureau"];
        if (!validRoles.includes(value)) {
          return NextResponse.json(
            { error: "Rôle invalide" },
            { status: 400 }
          );
        }

        const { error } = await (serviceClient as any)
          .from("lcb_profiles")
          .update({ role: value, updated_at: new Date().toISOString() })
          .eq("id", memberId);

        if (error) {
          return NextResponse.json(
            { error: "Erreur lors du changement de rôle: " + error.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: "Rôle mis à jour",
        });
      }

      default:
        return NextResponse.json(
          { error: "Action non reconnue" },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("Admin members API error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
