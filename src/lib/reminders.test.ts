import { describe, it, expect } from 'vitest';
import {
  dateStringInTimeZone,
  addDays,
  assignmentsDueOn,
  buildReminderMessage,
} from './reminders';
import type { Assignment } from '../types/assignment';

function makeAssignment(overrides: Partial<Assignment>): Assignment {
  return {
    id: 'a1',
    title: 'Untitled',
    classId: null,
    dueDate: '2026-09-01',
    type: 'other',
    done: false,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('dateStringInTimeZone', () => {
  it('rolls to the previous local day near UTC midnight in a negative-offset zone', () => {
    // 2026-09-02T02:00:00Z is still 2026-09-01 evening in New York (UTC-4 in September).
    const date = new Date('2026-09-02T02:00:00.000Z');
    expect(dateStringInTimeZone(date, 'America/New_York')).toBe('2026-09-01');
    expect(dateStringInTimeZone(date, 'UTC')).toBe('2026-09-02');
  });

  it('falls back to UTC for a null or invalid timezone instead of throwing', () => {
    const date = new Date('2026-09-02T12:00:00.000Z');
    expect(dateStringInTimeZone(date, null)).toBe('2026-09-02');
    expect(dateStringInTimeZone(date, 'Not/AZone')).toBe('2026-09-02');
  });
});

describe('addDays', () => {
  it('adds days within a month', () => {
    expect(addDays('2026-09-01', 1)).toBe('2026-09-02');
  });

  it('rolls over a month/year boundary', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('assignmentsDueOn', () => {
  it('returns only incomplete assignments due on the given date', () => {
    const data = {
      assignments: [
        makeAssignment({ id: 'a1', dueDate: '2026-09-01', done: false }),
        makeAssignment({ id: 'a2', dueDate: '2026-09-01', done: true }),
        makeAssignment({ id: 'a3', dueDate: '2026-09-02', done: false }),
      ],
    };
    const result = assignmentsDueOn(data, '2026-09-01');
    expect(result.map((a) => a.id)).toEqual(['a1']);
  });

  it('returns an empty array when nothing is due', () => {
    expect(assignmentsDueOn({ assignments: [] }, '2026-09-01')).toEqual([]);
  });
});

describe('buildReminderMessage', () => {
  it('returns null when nothing is due (no notification sent)', () => {
    expect(buildReminderMessage('due-today', [])).toBeNull();
  });

  it('names the single assignment when there is exactly one', () => {
    const msg = buildReminderMessage('due-tomorrow', [makeAssignment({ title: 'Bio Midterm' })]);
    expect(msg?.title).toBe('📌 Due tomorrow');
    expect(msg?.body).toBe('Bio Midterm');
  });

  it('summarizes when there is more than one', () => {
    const msg = buildReminderMessage('due-today', [
      makeAssignment({ title: 'Bio Midterm' }),
      makeAssignment({ title: 'Essay draft' }),
    ]);
    expect(msg?.title).toBe('🌱 Due today');
    expect(msg?.body).toBe('Bio Midterm + 1 more');
  });
});
