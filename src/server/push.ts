// Traces to spec.md story 12. Thin wrapper over the `web-push` package —
// VAPID JWT signing + RFC 8291 payload encryption aren't worth hand-rolling
// (plan.md's tech stack rationale). Used only by the two cron handlers.

import webpush from 'web-push';
import type { PushSubscriptionData } from '../types/push.js';
import type { ReminderMessage } from '../lib/reminders.js';
import type { KVClient } from './store.js';
import { saveUserData } from './store.js';
import type { UserData } from '../types/userData.js';

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

export interface SendResult {
  sent: boolean;
  cleared: boolean;
}

// v5 (story 10): used only by api/pomodoro/notify.ts to send a single
// user's Pomodoro period-end push. Deliberately a new, separate function
// rather than a refactor of the cron handlers' inline version of this same
// send-then-clear-on-expiry pattern (src/server/cronReminders.ts) — that
// code already sends real reminders against real production data and is
// already verified safe; duplicating ~10 simple lines here is a much
// smaller risk than touching it for a DRY cleanup (constitution.md's
// "Data safety" section: prefer not touching working, verified code).
export async function sendAndClearIfExpired(
  kv: KVClient,
  id: string,
  data: UserData,
  message: ReminderMessage,
  vapid: VapidConfig,
): Promise<SendResult> {
  if (!data.pushSubscription) return { sent: false, cleared: false };

  const endpointHost = safeHost(data.pushSubscription.endpoint);
  const result = await sendPushNotification(data.pushSubscription, message, vapid);
  if (result.ok) {
    console.log('[sprout] push sent', { id, endpointHost });
    return { sent: true, cleared: false };
  }

  // Log the actual error detail — web-push surfaces the push service's
  // real rejection here (statusCode + body), which is what makes a VAPID
  // key mismatch (401/403, body mentioning VAPID) distinguishable from an
  // expired subscription (404/410) or a transient network issue in the
  // logs, rather than all three looking like the same opaque failure.
  const errorDetail = describeWebPushError(result.error);
  console.warn('[sprout] push send failed', { id, endpointHost, expired: result.expired, errorDetail });

  if (!result.expired) return { sent: false, cleared: false };

  await saveUserData(kv, id, {
    name: data.name,
    classes: data.classes,
    assignments: data.assignments,
    onboardingDismissed: data.onboardingDismissed,
    linkNoticeDismissed: data.linkNoticeDismissed,
    pushSubscription: null,
    timeZone: data.timeZone,
  });
  console.log('[sprout] cleared expired push subscription', { id });
  return { sent: false, cleared: true };
}

function safeHost(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return 'invalid-endpoint';
  }
}

function describeWebPushError(error: unknown): { statusCode?: number; body?: string; message?: string } {
  const err = error as { statusCode?: number; body?: string; message?: string } | undefined;
  return { statusCode: err?.statusCode, body: err?.body, message: err?.message ?? String(error) };
}
