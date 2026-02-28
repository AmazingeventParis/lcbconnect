import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: list available channels (with membership status)
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("lcb_profiles")
      .select("id, role, status")
      .eq("id", user.id)
      .single();

    if (!profile || profile.status !== "approved") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Fetch all channel conversations
    const { data: channels } = await (supabase as any)
      .from("lcb_conversations")
      .select("id, name, group_type")
      .in("group_type", ["channel", "channel_ca"])
      .order("name", { ascending: true });

    // Filter CA channels for non-CA/bureau users
    const visibleChannels = (channels ?? []).filter((ch: any) => {
      if (ch.group_type === "channel_ca") {
        return profile.role === "ca" || profile.role === "bureau";
      }
      return true;
    });

    // Fetch user's memberships
    const channelIds = visibleChannels.map((ch: any) => ch.id);
    const { data: memberships } = await (supabase as any)
      .from("lcb_conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id)
      .in("conversation_id", channelIds);

    const joinedIds = new Set(
      (memberships ?? []).map((m: any) => m.conversation_id)
    );

    // Fetch member counts
    const { data: allMembers } = await (supabase as any)
      .from("lcb_conversation_members")
      .select("conversation_id")
      .in("conversation_id", channelIds);

    const countMap: Record<string, number> = {};
    (allMembers ?? []).forEach((m: any) => {
      countMap[m.conversation_id] = (countMap[m.conversation_id] || 0) + 1;
    });

    const result = visibleChannels.map((ch: any) => ({
      id: ch.id,
      name: ch.name,
      group_type: ch.group_type,
      joined: joinedIds.has(ch.id),
      member_count: countMap[ch.id] || 0,
    }));

    return NextResponse.json({ channels: result });
  } catch (err) {
    console.error("Channels API error:", err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

// POST: join a channel
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { channelId } = await request.json();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("lcb_profiles")
      .select("id, role, status")
      .eq("id", user.id)
      .single();

    if (!profile || profile.status !== "approved") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Verify channel exists and user has access
    const { data: channel } = await (supabase as any)
      .from("lcb_conversations")
      .select("id, group_type")
      .eq("id", channelId)
      .in("group_type", ["channel", "channel_ca"])
      .single();

    if (!channel) {
      return NextResponse.json({ error: "Groupe non trouvé" }, { status: 404 });
    }

    if (
      channel.group_type === "channel_ca" &&
      profile.role !== "ca" &&
      profile.role !== "bureau"
    ) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Join
    const { error } = await (supabase as any)
      .from("lcb_conversation_members")
      .insert({
        conversation_id: channelId,
        user_id: user.id,
      });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, message: "Déjà membre" });
      }
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Channel join error:", err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

// DELETE: leave a channel
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { channelId } = await request.json();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { error } = await (supabase as any)
      .from("lcb_conversation_members")
      .delete()
      .eq("conversation_id", channelId)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Channel leave error:", err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
