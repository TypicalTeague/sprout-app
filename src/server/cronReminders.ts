// Traces to spec.md story 12. Shared by both api/cron/*.ts adapters (same
// "thin adapter, real logic in server/" split as store.ts/api/data). Two
// callers instead of one function running twice: Vercel's Hobby plan only
// runs each cron job once a day (plan.md's "v4 revision note").

import process from 'node:process';
import { getKVClient, listUserIds } from './kvClient.js';
import { getUserData, saveUserData } from './store.js';
import { sendPushNotification } from './push.js';
import {
  assignmentsDueOn,
  buildReminderMessage,
  dateStringInTimeZone,
  addDays,
} from '../lib/reminders.js';
import type { ReminderKind } from '../lib/reminders.js';

export interface CronRunSummary {
  usersWithPush: number;
  notificationsSent: number;
  subscriptionsCleared: number;
}

export async function runReminderCron(kind: ReminderKind): Promise<CronRunSummary> {
  const summary: CronRunSummary = {
    usersWithPush: 0,
    notificationsSent: 0,
    subscriptionsCleared: 0,
  };

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    console.warn('[sprout] Missing VAPID env vars — skipping reminder cron run.');
    return summary;
  }

  const kv = getKVClient();
  const ids = await listUserIds();
  const now = new Date();

  for (const id of ids) {
    const data = await getUserData(kv, id);
    if (!data || !data.pushSubscription) continue;
    summary.usersWithPush += 1;

    const todayLocal = dateStringInTimeZone(now, data.timeZone);
    const targetDate = kind === 'due-tomorrow' ? addDays(todayLocal, 1) : todayLocal;
    const due = assignmentsDueOn(data, targetDate);
    const message = buildReminderMessage(kind, due);
    if (!message) continue;

    const result = await sendPushNotification(data.pushSubscription, message, {
      publicKey,
      privateKey,
      subject,
    });

    if (result.ok) {
      summary.notificationsSent += 1;
    } else if (result.expired) {
      // The one legitimate case for touching her record without her asking
      // — clearing a dead pointer, not her calendar data (plan.md's "v4
      // revision note"). Any other error leaves the subscription alone.
      await saveUserData(kv, id, {
        name: data.name,
        classes: data.classes,
        assignments: data.assignments,
        onboardingDismissed: data.onboardingDismissed,
        linkNoticeDismissed: data.linkNoticeDismissed,
        pushSubscription: null,
        timeZone: data.timeZone,
      });
      summary.subscriptionsCleared += 1;
    } else {
      console.warn('[sprout] Push send failed for user', id, result.error);
    }
  }

  return summary;
}
