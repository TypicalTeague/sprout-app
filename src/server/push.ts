// Traces to spec.md story 12. Thin wrapper over the `web-push` package —
// VAPID JWT signing + RFC 8291 payload encryption aren't worth hand-rolling
// (plan.md's tech stack rationale). Used only by the two cron handlers.

import webpush from 'web-push';
import type { PushSubscriptionData } from '../types/push.js';
import type { ReminderMessage } from '../lib/reminders.js';

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string; // "mailto:" or "https:" contact, per the VAPID spec
}

export type SendPushResult =
  | { ok: true }
  | { ok: false; expired: boolean; error: unknown };

export async function sendPushNotification(
  subscription: PushSubscriptionData,
  message: ReminderMessage,
  vapid: VapidConfig,
): Promise<SendPushResult> {
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: subscription.keys },
      JSON.stringify(message),
    );
    return { ok: true };
  } catch (error) {
    const statusCode = (error as { statusCode?: number } | undefined)?.statusCode;
    // 404/410 = the browser/OS has dropped this subscription for good
    // (uninstalled, permissions revoked, etc.) — safe and expected to clear
    // it. Any other error (network blip, 5xx) leaves it alone rather than
    // guessing (constitution.md's "Data safety" section).
    return { ok: false, expired: statusCode === 404 || statusCode === 410, error };
  }
}
