import admin from "firebase-admin";

function getApp() {
  if (admin.apps.length > 0) return admin.apps[0]!;

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!b64) {
    console.warn("[FCM] FIREBASE_SERVICE_ACCOUNT_BASE64 not set — FCM disabled");
    return null;
  }

  const credential = admin.credential.cert(
    JSON.parse(Buffer.from(b64, "base64").toString("utf-8")),
  );
  return admin.initializeApp({ credential });
}

export async function sendFCMToTokens(
  tokens: string[],
  payload: { title: string; body: string; url?: string; tag?: string },
): Promise<{ expired: string[] }> {
  const app = getApp();
  if (!app) return { expired: [] };

  const messaging = admin.messaging(app);

  const response = await messaging.sendEachForMulticast({
    tokens,
    data: {
      title: payload.title,
      body: payload.body || "",
      url: payload.url || "/",
      tag: payload.tag || "lcb-default",
    },
  });

  const expired: string[] = [];
  response.responses.forEach((resp, i) => {
    if (
      resp.error &&
      (resp.error.code === "messaging/registration-token-not-registered" ||
        resp.error.code === "messaging/invalid-registration-token")
    ) {
      expired.push(tokens[i]);
    }
  });

  return { expired };
}
