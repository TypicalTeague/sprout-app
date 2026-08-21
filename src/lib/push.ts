// Traces to spec.md story 12. The only place client code talks to the
// Push/Notification APIs — SettingsModal is the only caller.

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
