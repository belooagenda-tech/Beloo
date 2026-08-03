import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;
  if (!process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return false;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:contato@beloo.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
  vapidConfigured = true;
  return true;
}

async function sendToSubscriptions(
  admin: SupabaseClient<Database>,
  subscriptions: { id: string; endpoint: string; keys: Record<string, string> }[],
  payload: PushPayload,
) {
  if (subscriptions.length === 0 || !ensureVapidConfigured()) return;

  const expiredIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          },
          JSON.stringify(payload),
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          expiredIds.push(sub.id);
        }
      }
    }),
  );

  if (expiredIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", expiredIds);
  }
}

export async function sendPushToProfile(
  admin: SupabaseClient<Database>,
  profileId: string,
  payload: PushPayload,
) {
  const { data } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, keys")
    .eq("profile_id", profileId);
  await sendToSubscriptions(admin, data ?? [], payload);
}

export async function sendPushToClient(
  admin: SupabaseClient<Database>,
  clientId: string,
  payload: PushPayload,
) {
  const { data } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, keys")
    .eq("client_id", clientId);
  await sendToSubscriptions(admin, data ?? [], payload);
}
