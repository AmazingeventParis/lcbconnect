const NTFY_BASE = "https://ntfy.sh";

export async function sendNtfyNotifications(
  topics: string[],
  payload: { title: string; body: string; url?: string; tag?: string },
): Promise<void> {
  const clickUrl = payload.url
    ? `https://lcbconnect.swipego.app${payload.url}`
    : "https://lcbconnect.swipego.app";

  await Promise.allSettled(
    topics.map((topic) =>
      fetch(`${NTFY_BASE}/${topic}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          title: payload.title,
          message: payload.body || payload.title,
          click: clickUrl,
        }),
      }),
    ),
  );
}
