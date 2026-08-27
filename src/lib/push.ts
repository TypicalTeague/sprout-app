// Traces to spec.md story 12. The only place client code talks to the
// Push/Notification browser APIs (Notification/PushManager/ServiceWorker)
// — SettingsModal is the only caller of those. StudyTimer (v5, story 10)
// also lives here for scheduling Pomodoro period-end pushes, but it never
// touches the Notification/Push APIs directly — see schedulePomodoroPush
// below and plan.md's "v5 revision note" for why that has to be a
// server-scheduled push (via Upstash QStash) rather than anything the
// tab's own JS could trigger itself, to be reliable while her phone is
// locked.

import type { PushSubscriptionData } from '../types/push';

// VAPID public keys are meant to be public — the same way a Stripe
// publishable key is. Only the matching private key is a secret, and it
// lives in a Vercel env var, never in client code or git (plan.md's "v4
// revision note").
export const VAPID_PUBLIC_KEY =
  'BAwXoiWuWqZ1ChxoafePVmWkT3S_ZwiZa8c7idD9YW_QnYOAMOevpkBSb-6zUW_s4twT-pb653btNiXARLuyVwc';

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64Safe);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isInStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone) || window.matchMedia('(display-mode: standalone)').matches;
}

export type SubscribeResult =
  | { ok: true; subscription: PushSubscriptionData }
  | { ok: false; reason: 'ios-not-installed' | 'unsupported' | 'permission-denied' | 'error' };

// Notification.requestPermission() is the very first async call here, run
// straight from the Settings button's onClick with no `await` before it —
// the one hard requirement iOS enforces for the prompt to be honored
// (plan.md's "v4 revision note").
export async function subscribeToPush(): Promise<SubscribeResult> {
  if (isIOS() && !isInStandaloneMode()) {
    return { ok: false, reason: 'ios-not-installed' };
  }
  if (!isPushSupported()) {
    return { ok: false, reason: 'unsupported' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: 'permission-denied' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));
    return { ok: true, subscription: subscription.toJSON() as PushSubscriptionData };
  } catch (err) {
    console.warn('[sprout] push subscription failed', err);
    return { ok: false, reason: 'error' };
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  try {
    if (!isPushSupported()) return;
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    await existing?.unsubscribe();
  } catch (err) {
    console.warn('[sprout] push unsubscribe failed', err);
  }
}

// v5, story 10: schedules a real, server-delivered push notification for
// when the currently-running Pomodoro period ends. This is deliberately
// NOT a Notification/PushManager call from this tab's own JS — that JS
// only runs if the tab has execution time, which is exactly what gets
// suspended when the phone is locked, the same problem a client-triggered
// sound would have. Instead this just POSTs to our own
// /api/pomodoro/schedule, which asks Upstash QStash to call us back at
// the right time — the actual push send happens server-side
// (api/pomodoro/notify.ts), independent of whether her tab ever runs
// again before then. Fire-and-forget: a failed schedule call never blocks
// or breaks the timer (the in-app chime/visual still work regardless),
// it just means that one period transition won't get a push.
export async function schedulePomodoroPush(
  id: string,
  endAt: number,
  kind: 'focus' | 'break',
): Promise<void> {
  try {
    const delaySeconds = Math.max(1, Math.round((endAt - Date.now()) / 1000));
    await fetch('/api/pomodoro/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, kind, delaySeconds }),
    });
  } catch (err) {
    console.warn('[sprout] failed to schedule a Pomodoro push notification', err);
  }
}
