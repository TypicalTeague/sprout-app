// Traces to spec.md story 1 (Up Next urgency strip) and story 3 (Agenda
// group labels). Pure functions, unit tested, shared by both views so
// urgency logic isn't duplicated (plan.md interface surface).

export type UrgencyBucket = 'overdue' | 'today' | 'soon' | 'later';

function parseISODate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysBetween(from: Date, to: Date): number {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export function getUrgencyBucket(dueDate: string, today: Date = new Date()): UrgencyBucket {
  const diff = daysBetween(today, parseISODate(dueDate));
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= 3) return 'soon';
  return 'later';
}

export function getUrgencyLabel(dueDate: string, today: Date = new Date()): string {
  const diff = daysBetween(today, parseISODate(dueDate));
  if (diff < 0) return diff === -1 ? 'Overdue by 1 day' : `Overdue by ${Math.abs(diff)} days`;
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  return `In ${diff} days`;
}

export function formatShortDate(dateStr: string): string {
  return parseISODate(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function getAgendaGroupLabel(dateStr: string, today: Date = new Date()): string {
  const diff = daysBetween(today, parseISODate(dateStr));
  const dateLabel = formatShortDate(dateStr);
  if (diff < 0) return `Overdue · ${dateLabel}`;
  if (diff === 0) return `Today · ${dateLabel}`;
  if (diff === 1) return `Tomorrow · ${dateLabel}`;
  return dateLabel;
}
