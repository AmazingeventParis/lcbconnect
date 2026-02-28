import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

interface NotificationPayload {
  type: string;
  actorId: string;
  targetType: string;
  targetId: string;
  data?: Record<string, string>;
}

const VALID_TYPES = [
  "like",
  "comment",
  "reply",
  "event",
  "service",
  "complaint",
  "message",
  "admin",
  "document",
  "directory",
  "report",
  "mention",
];

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body: NotificationPayload = await request.json();
    const { type, actorId, targetType, targetId, data } = body;

    // Validate
    if (!type || !actorId || !targetType || !targetId) {
      return NextResponse.json(
        { error: "Champs requis manquants" },
        { status: 400 }
      );
    }

    if (actorId !== user.id) {
      return NextResponse.json(
        { error: "actorId ne correspond pas" },
        { status: 403 }
      );
    }

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Type invalide" }, { status: 400 });
    }

    const service = await createServiceClient();

    // Get actor profile for display name
    const { data: actorProfile } = await service
      .from("lcb_profiles")
      .select("full_name")
      .eq("id", actorId)
      .single();

    const actorName = actorProfile?.full_name ?? "Un membre";

    // Build notifications based on type + targetType
    const notifications: {
      user_id: string;
      type: string;
      title: string;
      body: string;
      link: string | null;
    }[] = [];

    if (type === "like" && targetType === "post") {
      // Notify post author
      const { data: post } = await service
        .from("lcb_posts")
        .select("author_id")
        .eq("id", targetId)
        .single();

      if (post && post.author_id !== actorId) {
        notifications.push({
          user_id: post.author_id,
          type: "like",
          title: `${actorName} a aimé votre publication`,
          body: "",
          link: `/feed/${targetId}`,
        });
      }
    } else if (type === "comment" && targetType === "post") {
      // Notify post author
      const { data: post } = await service
        .from("lcb_posts")
        .select("author_id")
        .eq("id", targetId)
        .single();

      if (post && post.author_id !== actorId) {
        notifications.push({
          user_id: post.author_id,
          type: "comment",
          title: `${actorName} a commenté votre publication`,
          body: "",
          link: `/feed/${targetId}`,
        });
      }
    } else if (type === "reply" && targetType === "comment") {
      // Notify parent comment author
      const { data: comment } = await service
        .from("lcb_comments")
        .select("author_id")
        .eq("id", targetId)
        .single();

      const postId = data?.postId;

      if (comment && comment.author_id !== actorId) {
        notifications.push({
          user_id: comment.author_id,
          type: "reply",
          title: `${actorName} a répondu à votre commentaire`,
          body: "",
          link: postId ? `/feed/${postId}` : null,
        });
      }
    } else if (type === "message" && targetType === "conversation") {
      // Notify other members of the conversation
      const { data: members } = await service
        .from("lcb_conversation_members")
        .select("user_id")
        .eq("conversation_id", targetId);

      if (members) {
        for (const member of members) {
          if (member.user_id !== actorId) {
            notifications.push({
              user_id: member.user_id,
              type: "message",
              title: `Nouveau message de ${actorName}`,
              body: "",
              link: "/messages",
            });
          }
        }
      }
    } else if (type === "event" && targetType === "event") {
      // New event → notify all approved members
      const { data: event } = await service
        .from("lcb_events")
        .select("title")
        .eq("id", targetId)
        .single();

      const eventTitle = event?.title ?? "un événement";

      const { data: members } = await service
        .from("lcb_profiles")
        .select("id")
        .eq("status", "approved");

      if (members) {
        for (const member of members) {
          if (member.id !== actorId) {
            notifications.push({
              user_id: member.id,
              type: "event",
              title: `Nouvel événement : ${eventTitle}`,
              body: "",
              link: `/events/${targetId}`,
            });
          }
        }
      }
    } else if (type === "event" && targetType === "event_registration") {
      // Registration → notify event creator
      const { data: event } = await service
        .from("lcb_events")
        .select("created_by, title")
        .eq("id", targetId)
        .single();

      if (event && event.created_by !== actorId) {
        notifications.push({
          user_id: event.created_by,
          type: "event",
          title: `${actorName} s'est inscrit(e) à ${event.title}`,
          body: "",
          link: `/events/${targetId}`,
        });
      }
    } else if (type === "document" && targetType === "document") {
      // New document → notify members with sufficient role
      const { data: doc } = await service
        .from("lcb_documents")
        .select("title, min_role")
        .eq("id", targetId)
        .single();

      const docTitle = doc?.title ?? "un document";
      const minRole = doc?.min_role ?? "membre";

      // Build role filter
      const roles: ("membre" | "ca" | "bureau")[] = ["bureau"];
      if (minRole === "ca" || minRole === "membre") roles.push("ca");
      if (minRole === "membre") roles.push("membre");

      const { data: members } = await service
        .from("lcb_profiles")
        .select("id")
        .eq("status", "approved")
        .in("role", roles);

      if (members) {
        for (const member of members) {
          if (member.id !== actorId) {
            notifications.push({
              user_id: member.id,
              type: "document",
              title: `Nouveau document : ${docTitle}`,
              body: "",
              link: "/documents",
            });
          }
        }
      }
    } else if (type === "directory" && targetType === "directory") {
      // New directory entry → notify CA/bureau only
      const { data: entry } = await service
        .from("lcb_directory")
        .select("name")
        .eq("id", targetId)
        .single();

      const entryName = entry?.name ?? "une adresse";

      const { data: members } = await service
        .from("lcb_profiles")
        .select("id")
        .eq("status", "approved")
        .in("role", ["ca", "bureau"]);

      if (members) {
        for (const member of members) {
          if (member.id !== actorId) {
            notifications.push({
              user_id: member.id,
              type: "directory",
              title: `Nouvelle adresse proposée : ${entryName}`,
              body: "",
              link: `/directory/${targetId}`,
            });
          }
        }
      }
    } else if (type === "directory" && targetType === "directory_review") {
      // Review on directory entry → notify entry creator
      const { data: entry } = await service
        .from("lcb_directory")
        .select("created_by, name")
        .eq("id", targetId)
        .single();

      if (entry && entry.created_by !== actorId) {
        notifications.push({
          user_id: entry.created_by,
          type: "directory",
          title: `${actorName} a laissé un avis sur ${entry.name}`,
          body: "",
          link: `/directory/${targetId}`,
        });
      }
    } else if (type === "report" && targetType === "post") {
      // Report on post → notify all CA/bureau members (including self)
      const { data: admins } = await service
        .from("lcb_profiles")
        .select("id")
        .eq("status", "approved")
        .in("role", ["ca", "bureau"]);

      if (admins) {
        for (const admin of admins) {
          notifications.push({
            user_id: admin.id,
            type: "report",
            title:
              admin.id === actorId
                ? "Votre signalement a été enregistré"
                : `${actorName} a signalé une publication`,
            body: "",
            link: "/admin/reports",
          });
        }
      }
    } else if (type === "mention" && targetType === "message") {
      // Mention in message → notify mentioned users
      // data.mentionedUserIds is a comma-separated string of user IDs
      const mentionedIds = data?.mentionedUserIds?.split(",").filter(Boolean) ?? [];

      for (const uid of mentionedIds) {
        if (uid !== actorId) {
          notifications.push({
            user_id: uid,
            type: "mention",
            title: `${actorName} vous a mentionné(e) dans un message`,
            body: "",
            link: "/messages",
          });
        }
      }
    }

    // Filter out notifications for users who disabled this type
    let filtered = notifications;
    if (notifications.length > 0) {
      const userIds = [...new Set(notifications.map((n) => n.user_id))];
      const { data: profiles } = await service
        .from("lcb_profiles")
        .select("id, notification_prefs")
        .in("id", userIds);

      if (profiles) {
        const prefsMap = new Map<string, Record<string, boolean>>();
        for (const p of profiles) {
          if (p.notification_prefs && typeof p.notification_prefs === "object") {
            prefsMap.set(p.id, p.notification_prefs as Record<string, boolean>);
          }
        }

        const TYPE_TO_PREF: Record<string, string> = {
          like: "likes",
          comment: "comments",
          reply: "replies",
          message: "messages",
          mention: "mentions",
          event: "events",
          document: "documents",
          directory: "directory",
          report: "reports",
          admin: "reports",
          complaint: "reports",
          service: "reports",
        };

        filtered = notifications.filter((n) => {
          const userPrefs = prefsMap.get(n.user_id);
          if (!userPrefs) return true; // No prefs = all enabled
          const prefKey = TYPE_TO_PREF[n.type];
          if (!prefKey) return true;
          return userPrefs[prefKey] !== false; // undefined or true = enabled
        });
      }
    }

    // Bulk insert
    if (filtered.length > 0) {
      await service.from("lcb_notifications").insert(filtered);
    }

    return NextResponse.json({ ok: true, count: filtered.length });
  } catch {
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}
