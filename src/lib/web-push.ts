import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:contact@lcbconnect.swipego.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function sendPushToUser(
  subscriptions: { endpoint: string; p256dh: string; auth: string }[],
  payload: { title: string; body: string; url?: string; tag?: string },
) {
  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body,
      )
    ),
  );
  // Collect expired endpoints (410 Gone) for cleanup
  const expired: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "rejected" && (r.reason as { statusCode?: number })?.statusCode === 410) {
      expired.push(subscriptions[i].endpoint);
    }
  }
  return { expired };
}
