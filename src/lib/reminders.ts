// Traces to spec.md story 12. Pure, unit-tested logic shared by both cron
// handlers (api/cron/evening-reminders.ts, api/cron/morning-reminders.ts).
// "Today"/"tomorrow" only mean anything relative to *her* timezone, not the
// cron function's server-local (UTC) date — see plan.md's "v4 revision
// note" for why timeZone is captured client-side at all.

import type { Assignment } from '../types/assignment';
import type { UserData } from '../types/userData';

export type ReminderKind = 'due-tomorrow' | 'due-today';

export interface ReminderMessage {
  title: string;
  body: string;
  url: string;
}

// YYYY-MM-DD for `date` as observed in `timeZone` (falls back to UTC if the
// zone is missing or not a valid IANA name). en-CA formats y-m-d, matching
// the ISO date strings Assignment.dueDate already uses.
export function dateStringInTimeZone(date: Date, timeZone: string | null): string {
  const format = (zone: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  try {
    return format(timeZone || 'UTC');
  } catch {
    return format('UTC');
  }
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function assignmentsDueOn(
  data: Pick<UserData, 'assignments'>,
  dateStr: string,
): Assignment[] {
  return data.assignments.filter((a) => !a.done && a.dueDate === dateStr);
}

export function buildReminderMessage(
  kind: ReminderKind,
  assignments: Assignment[],
): ReminderMessage | null {
  if (assignments.length === 0) return null;
  const title = kind === 'due-tomorrow' ? '📌 Due tomorrow' : '🌱 Due today';
  const body =
    assignments.length === 1
      ? assignments[0].title
      : `${assignments[0].title} + ${assignments.length - 1} more`;
  return { title, body, url: '/' };
}
