// Traces to spec.md story 10 (v5). Called by the client (StudyTimer, via
// src/lib/push.ts's schedulePomodoroPush) each time a focus/break period
// starts or naturally transitions while she's opted into notifications.
// Thin adapter: real scheduling logic is in src/server/qstash.ts.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import process from 'node:process';
import { scheduleDelayedCall } from '../../src/server/qstash.js';

const ID_PATTERN = /^[a-zA-Z0-9-]{8,100}$/;
// Generous ceiling above the timer's own max lengths (180min focus /
// 60min break) — just a sanity bound, not a real limit anyone should hit.
const MAX_DELAY_SECONDS = 4 * 60 * 60;

function notifyUrl(): string {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? 'sprout-app-nu.vercel.app';
  return `https://${host}/api/pomodoro/notify`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as {
    id?: string;
    kind?: string;
    delaySeconds?: number;
  } | null;
  const id = body?.id;
  const kind = body?.kind;
  const delaySeconds = body?.delaySeconds;

  if (
    typeof id !== 'string' ||
    !ID_PATTERN.test(id) ||
    (kind !== 'focus' && kind !== 'break') ||
    typeof delaySeconds !== 'number' ||
    !Number.isFinite(delaySeconds) ||
    delaySeconds <= 0
  ) {
    console.warn('[sprout] /api/pomodoro/schedule: rejected invalid body', { id, kind, delaySeconds });
    res.status(400).json({ error: 'invalid_body' });
    return;
  }

  const clampedDelay = Math.min(delaySeconds, MAX_DELAY_SECONDS);
  const notBeforeSeconds = Math.floor(Date.now() / 1000) + Math.round(clampedDelay);
  console.log('[sprout] /api/pomodoro/schedule: scheduling', { id, kind, clampedDelay, notBeforeSeconds });
  const result = await scheduleDelayedCall(notifyUrl(), { id, kind }, notBeforeSeconds);
  res.status(200).json(result);
}
