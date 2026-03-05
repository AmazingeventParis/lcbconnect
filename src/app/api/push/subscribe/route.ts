import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { endpoint, p256dh, auth, type } = await request.json();
    const subType = type === "ntfy" ? "ntfy" : "web";

    if (!endpoint) {
      return NextResponse.json(
        { error: "Champs requis manquants" },
        { status: 400 },
      );
    }

    // Web Push requires p256dh + auth; ntfy only needs the topic as endpoint
    if (subType === "web" && (!p256dh || !auth)) {
      return NextResponse.json(
        { error: "Champs requis manquants (web push)" },
        { status: 400 },
      );
    }

    const service = await createServiceClient();
    await service.from("lcb_push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh: p256dh || "",
        auth: auth || "",
        type: subType,
      },
      { onConflict: "user_id,endpoint", ignoreDuplicates: false },
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
