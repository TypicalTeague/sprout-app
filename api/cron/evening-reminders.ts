// Vercel Cron target — "due tomorrow" reminders, ~evening. See
// vercel.json's crons array and plan.md's "v4 revision note" for the
// UTC/Hobby-cron-timing caveats. Thin adapter: real logic in
// src/server/cronReminders.ts.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import process from 'node:process';
import { runReminderCron } from '../../src/server/cronReminders.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const summary = await runReminderCron('due-tomorrow');
  res.status(200).json({ ok: true, ...summary });
}
