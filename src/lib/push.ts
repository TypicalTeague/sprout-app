// Traces to spec.md story 12. The only place client code talks to the
// Push/Notification APIs — SettingsModal and (v5) StudyTimer are the only
// callers.

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

// v5, story 10: a *local* notification (shown directly by the already-
// registered service worker), not a server-sent Web Push — no new API
// endpoint or server round-trip for a session-only, client-side timer
// event. Only ever checks whether permission is already granted; never
// requests it (the caller is responsible for gating on her actual opt-in
// choice — see StudyTimer.tsx's `notificationsEnabled` prop, since turning
// notifications off in Settings clears the push subscription but can't
// revoke the browser-level permission grant).
export async function showLocalNotification(title: string, body: string): Promise<void> {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
      });
      return;
    }
    new Notification(title, { body });
  } catch (err) {
    console.warn('[sprout] local notification failed', err);
  }
}
