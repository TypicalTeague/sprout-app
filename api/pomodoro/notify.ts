// Traces to spec.md story 10 (v5). Called by QStash (never the client
// directly) at approximately the timestamp scheduled by
// api/pomodoro/schedule.ts — this is what actually sends the push,
// independent of whether her tab/phone was ever awake to trigger it.
// Signature-verified so the URL isn't a free "spam her phone" trigger for
// anyone who finds it (same concern CRON_SECRET addresses for the cron
// routes). Needs the raw request body to verify the signature, hence
// `bodyParser: false` + a manual read below.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import process from 'node:process';
import { getUserData } from '../../src/server/store.js';
import { getKVClient } from '../../src/server/kvClient.js';
import { sendAndClearIfExpired } from '../../src/server/push.js';
import { verifyQstashSignature } from '../../src/server/qstash.js';
import { buildPomodoroPushMessage } from '../../src/lib/pomodoro.js';
import type { PomodoroMode } from '../../src/lib/pomodoro.js';

export const config = { api: { bodyParser: false } };

async function readRawBody(req: VercelRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  console.log('[sprout] /api/pomodoro/notify invoked', { hasSignatureHeader: 'upstash-signature' in req.headers });

  const rawBody = await readRawBody(req);
  const signatureHeader = req.headers['upstash-signature'];
  const signature = typeof signatureHeader === 'string' ? signatureHeader : undefined;
  const valid = await verifyQstashSignature(signature, rawBody);
  if (!valid) {
    // verifyQstashSignature() already logs the specific reason (no header,
    // no signing keys configured, or a genuine verify() failure) — this is
    // just the HTTP-level consequence. A failed verification here drops
    // the request with a 401 and nothing else happens; if pushes stop
    // arriving, check for this specifically in the logs above.
    console.warn('[sprout] /api/pomodoro/notify: signature verification failed, dropping request');
    res.status(401).json({ error: 'invalid_signature' });
    return;
  }

  let payload: { id?: string; kind?: string };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    res.status(400).json({ error: 'invalid_body' });
    return;
  }

  const { id, kind } = payload;
  if (typeof id !== 'string' || (kind !== 'focus' && kind !== 'break')) {
    res.status(400).json({ error: 'invalid_body' });
    return;
  }
  console.log('[sprout] /api/pomodoro/notify: verified, payload =', { id, kind });

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    console.warn('[sprout] Missing VAPID env vars — skipping Pomodoro push.');
    res.status(200).json({ ok: true, sent: false, reason: 'not_configured' });
    return;
  }

  const kv = getKVClient();
  const data = await getUserData(kv, id);
  if (!data || !data.pushSubscription) {
    // She's since turned notifications off, or the identity is unknown —
    // nothing to do, not an error (this is expected whenever she disables
    // notifications between scheduling and delivery).
    console.log('[sprout] /api/pomodoro/notify: no push subscription on record, nothing to send', {
      id,
      foundRecord: data != null,
    });
    res.status(200).json({ ok: true, sent: false });
    return;
  }

  const message = buildPomodoroPushMessage(kind as PomodoroMode);
  const result = await sendAndClearIfExpired(kv, id, data, message, {
    publicKey,
    privateKey,
    subject,
  });
  res.status(200).json({ ok: true, ...result });
}
