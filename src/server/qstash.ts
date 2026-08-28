// Traces to spec.md story 10 (v5, Pomodoro period-end notifications).
// Upstash QStash is what makes those notifications actually reliable when
// her phone is locked — see plan.md's "v5 revision note" for why a
// client-triggered local notification can't do that (it needs the same
// JS execution that gets suspended when the phone locks), and why the
// fix has to be a delayed webhook scheduled server-side instead.
//
// Two things live here: scheduling a one-off delayed callback (used by
// api/pomodoro/schedule.ts, called from the client when a period starts),
// and verifying that an inbound call to api/pomodoro/notify.ts genuinely
// came from QStash and not from anyone who finds the URL (the same
// concern CRON_SECRET addresses for the cron routes, just via QStash's
// own signature scheme instead of a static bearer secret).

import process from 'node:process';
import { Client, Receiver } from '@upstash/qstash';

export type SchedulePushResult =
  | { ok: true }
  | { ok: false; reason: 'not_configured' | 'error' };

// `notBeforeSeconds` is an absolute unix timestamp (seconds), not a
// duration — matches this app's general preference for scheduling off a
// real clock timestamp rather than a derived delay (see lib/pomodoro.ts).
export async function scheduleDelayedCall(
  targetUrl: string,
  body: unknown,
  notBeforeSeconds: number,
): Promise<SchedulePushResult> {
  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    console.warn('[sprout] QStash schedule skipped: QSTASH_TOKEN not configured');
    return { ok: false, reason: 'not_configured' };
  }
  try {
    const client = new Client({ token });
    const result = await client.publishJSON({ url: targetUrl, body, notBefore: notBeforeSeconds });
    console.log('[sprout] QStash message scheduled', {
      messageId: (result as { messageId?: string }).messageId,
      targetUrl,
      notBeforeSeconds,
      secondsFromNow: notBeforeSeconds - Math.floor(Date.now() / 1000),
    });
    return { ok: true };
  } catch (err) {
    console.warn('[sprout] QStash schedule failed', { targetUrl, notBeforeSeconds, err });
    return { ok: false, reason: 'error' };
  }
}

export async function verifyQstashSignature(
  signature: string | undefined,
  rawBody: string,
): Promise<boolean> {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (!signature) {
    console.warn('[sprout] QStash signature verification skipped: no upstash-signature header on request');
    return false;
  }
  if (!currentSigningKey || !nextSigningKey) {
    console.warn('[sprout] QStash signature verification skipped: signing keys not configured');
    return false;
  }
  try {
    const receiver = new Receiver({ currentSigningKey, nextSigningKey });
    const valid = await receiver.verify({ signature, body: rawBody });
    console.log('[sprout] QStash signature verify() ->', valid);
    return valid;
  } catch (err) {
    // verify() throws SignatureError on a bad/forged signature — that's
    // exactly the "reject" case, not a bug, but still worth logging so a
    // *legitimate* signature that's failing for some other reason (e.g.
    // signing keys rotated/mismatched) doesn't look identical to a genuine
    // forgery attempt in the logs.
    console.warn('[sprout] QStash signature verify() threw', err);
    return false;
  }
}
