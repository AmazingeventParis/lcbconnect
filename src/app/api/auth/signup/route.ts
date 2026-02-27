import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name, boat_name } = await request.json();

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: "Champs requis manquants" },
        { status: 400 }
      );
    }

    const serviceClient = await createServiceClient();

    // Create user with email auto-confirmed
    const { data, error } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        boat_name: boat_name || undefined,
      },
    });

    if (error) {
      // Handle duplicate email
      if (error.message.includes("already been registered")) {
        return NextResponse.json(
          { error: "Cette adresse e-mail est deja utilisee." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, userId: data.user.id });
  } catch {
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
