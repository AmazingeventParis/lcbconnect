import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { hasMinRole } from "@/lib/constants";

async function getAuthorizedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("lcb_profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !hasMinRole(profile.role, "ca")) return null;

  return profile;
}

export async function GET() {
  try {
    const profile = await getAuthorizedUser();
    if (!profile) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const serviceClient = await createServiceClient();

    const [foldersResult, documentsResult] = await Promise.all([
      (serviceClient as any)
        .from("lcb_document_folders")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      (serviceClient as any)
        .from("lcb_documents")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    return NextResponse.json({
      folders: foldersResult.data ?? [],
      documents: documentsResult.data ?? [],
    });
  } catch (err) {
    console.error("Admin documents GET error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getAuthorizedUser();
    if (!profile) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;
    const serviceClient = await createServiceClient();

    switch (action) {
      case "create_folder": {
        const { name, parent_id } = body;
        if (!name?.trim()) {
          return NextResponse.json(
            { error: "Le nom du dossier est requis" },
            { status: 400 }
          );
        }

        const { data, error } = await (serviceClient as any)
          .from("lcb_document_folders")
          .insert({
            name: name.trim(),
            parent_id: parent_id || null,
            created_by: profile.id,
          })
          .select()
          .single();

        if (error) {
          return NextResponse.json(
            { error: "Erreur création dossier: " + error.message },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, folder: data });
      }

      case "publish": {
        const { documentId } = body;
        if (!documentId) {
          return NextResponse.json(
            { error: "ID document requis" },
            { status: 400 }
          );
        }

        const { error } = await (serviceClient as any)
          .from("lcb_documents")
          .update({ is_published: true })
          .eq("id", documentId);

        if (error) {
          return NextResponse.json(
            { error: "Erreur publication: " + error.message },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true });
      }

      case "unpublish": {
        const { documentId } = body;
        if (!documentId) {
          return NextResponse.json(
            { error: "ID document requis" },
            { status: 400 }
          );
        }

        const { error } = await (serviceClient as any)
          .from("lcb_documents")
          .update({ is_published: false })
          .eq("id", documentId);

        if (error) {
          return NextResponse.json(
            { error: "Erreur dépublication: " + error.message },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true });
      }

      case "move_document": {
        const { documentId, folderId } = body;
        if (!documentId) {
          return NextResponse.json(
            { error: "ID document requis" },
            { status: 400 }
          );
        }

        const { error } = await (serviceClient as any)
          .from("lcb_documents")
          .update({ folder_id: folderId || null })
          .eq("id", documentId);

        if (error) {
          return NextResponse.json(
            { error: "Erreur déplacement: " + error.message },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: "Action non reconnue" },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("Admin documents POST error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const profile = await getAuthorizedUser();
    if (!profile) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { folderId, name } = body;

    if (!folderId || !name?.trim()) {
      return NextResponse.json(
        { error: "ID dossier et nom requis" },
        { status: 400 }
      );
    }

    const serviceClient = await createServiceClient();

    const { error } = await (serviceClient as any)
      .from("lcb_document_folders")
      .update({ name: name.trim() })
      .eq("id", folderId);

    if (error) {
      return NextResponse.json(
        { error: "Erreur renommage: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin documents PATCH error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const profile = await getAuthorizedUser();
    if (!profile) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (!type || !id) {
      return NextResponse.json(
        { error: "Type et ID requis" },
        { status: 400 }
      );
    }

    const serviceClient = await createServiceClient();

    if (type === "folder") {
      const { error } = await (serviceClient as any)
        .from("lcb_document_folders")
        .delete()
        .eq("id", id);

      if (error) {
        return NextResponse.json(
          { error: "Erreur suppression dossier: " + error.message },
          { status: 500 }
        );
      }
    } else if (type === "document") {
      const { error } = await (serviceClient as any)
        .from("lcb_documents")
        .delete()
        .eq("id", id);

      if (error) {
        return NextResponse.json(
          { error: "Erreur suppression document: " + error.message },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Type invalide (folder ou document)" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin documents DELETE error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
