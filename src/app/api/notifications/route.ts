import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/web-push";
import { sendNtfyNotifications } from "@/lib/ntfy";

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

    // Build notifications based on type + targetType
    // Parallelize: fetch actor name + target data simultaneously
    const notifications: {
      user_id: string;
      type: string;
      title: string;
      body: string;
      link: string | null;
    }[] = [];

    // Helper to get actor name (launched in parallel with target queries)
    const actorNamePromise = service
      .from("lcb_profiles")
      .select("full_name")
      .eq("id", actorId)
      .single()
      .then(({ data }) => data?.full_name ?? "Un membre");

    if (type === "like" && targetType === "post") {
      const [actorName, { data: post }] = await Promise.all([
        actorNamePromise,
        service.from("lcb_posts").select("author_id").eq("id", targetId).single(),
      ]);
      if (post && post.author_id !== actorId) {
        notifications.push({
          user_id: post.author_id, type: "like",
          title: `${actorName} a aimé votre publication`, body: "", link: `/feed/${targetId}`,
        });
      }
    } else if (type === "comment" && targetType === "post") {
      const [actorName, { data: post }] = await Promise.all([
        actorNamePromise,
        service.from("lcb_posts").select("author_id").eq("id", targetId).single(),
      ]);
      if (post && post.author_id !== actorId) {
        notifications.push({
          user_id: post.author_id, type: "comment",
          title: `${actorName} a commenté votre publication`, body: "", link: `/feed/${targetId}`,
        });
      }
    } else if (type === "reply" && targetType === "comment") {
      const [actorName, { data: comment }] = await Promise.all([
        actorNamePromise,
        service.from("lcb_comments").select("author_id").eq("id", targetId).single(),
      ]);
      const postId = data?.postId;
      if (comment && comment.author_id !== actorId) {
        notifications.push({
          user_id: comment.author_id, type: "reply",
          title: `${actorName} a répondu à votre commentaire`, body: "",
          link: postId ? `/feed/${postId}` : null,
        });
      }
    } else if (type === "message" && targetType === "conversation") {
      const [actorName, { data: members }] = await Promise.all([
        actorNamePromise,
        service.from("lcb_conversation_members").select("user_id").eq("conversation_id", targetId),
      ]);
      if (members) {
        for (const member of members) {
          if (member.user_id !== actorId) {
            notifications.push({
              user_id: member.user_id, type: "message",
              title: `Nouveau message de ${actorName}`, body: "", link: "/messages",
            });
          }
        }
      }
    } else if (type === "event" && targetType === "event") {
      const [actorName, { data: event }, { data: members }] = await Promise.all([
        actorNamePromise,
        service.from("lcb_events").select("title").eq("id", targetId).single(),
        service.from("lcb_profiles").select("id").eq("status", "approved"),
      ]);
      const eventTitle = event?.title ?? "un événement";
      if (members) {
        for (const member of members) {
          if (member.id !== actorId) {
            notifications.push({
              user_id: member.id, type: "event",
              title: `Nouvel événement : ${eventTitle}`, body: "", link: `/events/${targetId}`,
            });
          }
        }
      }
    } else if (type === "event" && targetType === "event_registration") {
      const [actorName, { data: event }] = await Promise.all([
        actorNamePromise,
        service.from("lcb_events").select("created_by, title").eq("id", targetId).single(),
      ]);
      if (event && event.created_by !== actorId) {
        notifications.push({
          user_id: event.created_by, type: "event",
          title: `${actorName} s'est inscrit(e) à ${event.title}`, body: "",
          link: `/events/${targetId}`,
        });
      }
    } else if (type === "document" && targetType === "document") {
      const [, { data: doc }] = await Promise.all([
        actorNamePromise, // resolve but unused — keeps the promise alive
        service.from("lcb_documents").select("title, min_role").eq("id", targetId).single(),
      ]);
      const docTitle = doc?.title ?? "un document";
      const minRole = doc?.min_role ?? "membre";
      const roles: ("membre" | "ca" | "bureau")[] = ["bureau"];
      if (minRole === "ca" || minRole === "membre") roles.push("ca");
      if (minRole === "membre") roles.push("membre");

      const { data: members } = await service
        .from("lcb_profiles").select("id").eq("status", "approved").in("role", roles);
      if (members) {
        for (const member of members) {
          if (member.id !== actorId) {
            notifications.push({
              user_id: member.id, type: "document",
              title: `Nouveau document : ${docTitle}`, body: "", link: "/documents",
            });
          }
        }
      }
    } else if (type === "directory" && targetType === "directory") {
      const [, { data: entry }, { data: members }] = await Promise.all([
        actorNamePromise,
        service.from("lcb_directory").select("name").eq("id", targetId).single(),
        service.from("lcb_profiles").select("id").eq("status", "approved").in("role", ["ca", "bureau"]),
      ]);
      const entryName = entry?.name ?? "une adresse";
      if (members) {
        for (const member of members) {
          if (member.id !== actorId) {
            notifications.push({
              user_id: member.id, type: "directory",
              title: `Nouvelle adresse proposée : ${entryName}`, body: "",
              link: `/directory/${targetId}`,
            });
          }
        }
      }
    } else if (type === "directory" && targetType === "directory_review") {
      const [actorName, { data: entry }] = await Promise.all([
        actorNamePromise,
        service.from("lcb_directory").select("created_by, name").eq("id", targetId).single(),
      ]);
      if (entry && entry.created_by !== actorId) {
        notifications.push({
          user_id: entry.created_by, type: "directory",
          title: `${actorName} a laissé un avis sur ${entry.name}`, body: "",
          link: `/directory/${targetId}`,
        });
      }
    } else if (type === "report" && targetType === "post") {
      const [actorName, { data: admins }] = await Promise.all([
        actorNamePromise,
        service.from("lcb_profiles").select("id").eq("status", "approved").in("role", ["ca", "bureau"]),
      ]);
      if (admins) {
        for (const admin of admins) {
          notifications.push({
            user_id: admin.id, type: "report",
            title: admin.id === actorId
              ? "Votre signalement a été enregistré"
              : `${actorName} a signalé une publication`,
            body: "", link: "/admin/reports",
          });
        }
      }
    } else if (type === "mention" && targetType === "message") {
      const actorName = await actorNamePromise;
      const mentionedIds = data?.mentionedUserIds?.split(",").filter(Boolean) ?? [];
      for (const uid of mentionedIds) {
        if (uid !== actorId) {
          notifications.push({
            user_id: uid, type: "mention",
            title: `${actorName} vous a mentionné(e) dans un message`, body: "", link: "/messages",
          });
        }
      }
    }

    // Filter by user notification preferences + bulk insert in parallel
    if (notifications.length > 0) {
      const userIds = [...new Set(notifications.map((n) => n.user_id))];
      const { data: profiles } = await service
        .from("lcb_profiles")
        .select("id, notification_prefs")
        .in("id", userIds);

      let filtered = notifications;
      if (profiles) {
        const TYPE_TO_PREF: Record<string, string> = {
          like: "likes", comment: "comments", reply: "replies",
          message: "messages", mention: "mentions", event: "events",
          document: "documents", directory: "directory",
          report: "reports", admin: "reports", complaint: "reports", service: "reports",
        };
        const prefsMap = new Map<string, Record<string, boolean>>();
        for (const p of profiles) {
          if (p.notification_prefs && typeof p.notification_prefs === "object") {
            prefsMap.set(p.id, p.notification_prefs as Record<string, boolean>);
          }
        }
        filtered = notifications.filter((n) => {
          const userPrefs = prefsMap.get(n.user_id);
          if (!userPrefs) return true;
          const prefKey = TYPE_TO_PREF[n.type];
          if (!prefKey) return true;
          return userPrefs[prefKey] !== false;
        });
      }

      if (filtered.length > 0) {
        await service.from("lcb_notifications").insert(filtered);

        // Send push notifications
        const recipientIds = [...new Set(filtered.map((n) => n.user_id))];
        const { data: subs } = await service
          .from("lcb_push_subscriptions")
          .select("user_id, endpoint, p256dh, auth, type")
          .in("user_id", recipientIds);

        if (subs && subs.length > 0) {
          const webSubsByUser = new Map<string, typeof subs>();
          const ntfySubsByUser = new Map<string, typeof subs>();
          for (const sub of subs) {
            const map = sub.type === "ntfy" ? ntfySubsByUser : webSubsByUser;
            const list = map.get(sub.user_id) || [];
            list.push(sub);
            map.set(sub.user_id, list);
          }

          const pushPromises: Promise<void>[] = [];
          const allExpired: string[] = [];

          for (const notif of filtered) {
            const payload = {
              title: notif.title,
              body: notif.body || "",
              url: notif.link || "/",
              tag: `lcb-${notif.type}`,
            };

            // Web Push
            const webSubs = webSubsByUser.get(notif.user_id);
            if (webSubs && webSubs.length > 0) {
              pushPromises.push(
                sendPushToUser(webSubs, payload)
                  .then(({ expired }) => { allExpired.push(...expired); })
                  .catch(() => {}),
              );
            }

            // ntfy (APK Android)
            const ntfySubs = ntfySubsByUser.get(notif.user_id);
            if (ntfySubs && ntfySubs.length > 0) {
              const topics = ntfySubs.map((s) => s.endpoint);
              pushPromises.push(
                sendNtfyNotifications(topics, payload).catch(() => {}),
              );
            }
          }

          await Promise.allSettled(pushPromises);

          // Cleanup all expired tokens at once
          if (allExpired.length > 0) {
            await service
              .from("lcb_push_subscriptions")
              .delete()
              .in("endpoint", allExpired);
          }
        }
      }

      return NextResponse.json({ ok: true, count: filtered.length });
    }

    return NextResponse.json({ ok: true, count: 0 });
  } catch {
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}
