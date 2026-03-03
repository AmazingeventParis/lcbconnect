import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { hasMinRole } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 60;

// Allow up to 50 MB uploads (Next.js default is 4 MB)
export const fetchCache = "default-no-store";


export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("lcb_profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (!profile || !hasMinRole(profile.role, "ca")) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Parse FormData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folderId = formData.get("folder_id") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Le fichier dépasse 50 Mo" },
        { status: 400 }
      );
    }

    // Upload to storage with service role (bypasses all RLS)
    const serviceClient = await createServiceClient();
    const filePath = `${profile.id}/${Date.now()}-${file.name}`;

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await serviceClient.storage
      .from("lcb-documents")
      .upload(filePath, fileBuffer, {
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: "Erreur upload storage: " + uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = serviceClient.storage.from("lcb-documents").getPublicUrl(filePath);

    // Insert DB record with service role
    const { error: insertError } = await (serviceClient as any)
      .from("lcb_documents")
      .insert({
        uploaded_by: profile.id,
        title: file.name,
        description: null,
        category: "divers",
        year: new Date().getFullYear(),
        file_url: publicUrl,
        file_size: file.size,
        min_role: "membre",
        folder_id: folderId || null,
        is_published: false,
      });

    if (insertError) {
      console.error("DB insert error:", insertError);
      return NextResponse.json(
        { error: "Erreur enregistrement: " + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, fileName: file.name });
  } catch (err) {
    console.error("Upload API error:", err);
    return NextResponse.json(
      { error: "Erreur serveur inattendue" },
      { status: 500 }
    );
  }
}
