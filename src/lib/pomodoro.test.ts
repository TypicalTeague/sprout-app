import { describe, it, expect } from 'vitest';
import { startSession, advanceSession, buildPomodoroPushMessage } from './pomodoro';

const FOCUS_MIN = 25;
const BREAK_MIN = 5;

describe('startSession', () => {
  it('schedules endAt exactly one period ahead of now', () => {
    const now = 1_000_000;
    const session = startSession('focus', now, FOCUS_MIN, BREAK_MIN);
    expect(session.endAt).toBe(now + FOCUS_MIN * 60 * 1000);
    expect(session.cyclesCompleted).toBe(0);
  });
});

describe('advanceSession', () => {
  it('does not advance before the period ends, and reports remaining time from the clock', () => {
    const now = 0;
    const session = startSession('focus', now, FOCUS_MIN, BREAK_MIN);
    const result = advanceSession(session, now + 90_000, FOCUS_MIN, BREAK_MIN); // 90s elapsed
    expect(result.periodsCompleted).toBe(0);
    expect(result.remainingMs).toBe(FOCUS_MIN * 60 * 1000 - 90_000);
    expect(result.session.mode).toBe('focus');
  });

  it('stays accurate after a long background gap in a single call — no drift (v5 bug fix)', () => {
    // Simulates exactly the reported bug: the tab was backgrounded and only
    // one throttled tick fired, long after the period should have ended.
    const now = 0;
    const session = startSession('focus', now, FOCUS_MIN, BREAK_MIN);
    const gapMs = FOCUS_MIN * 60 * 1000 + 30_000; // 30s into the break period
    const result = advanceSession(session, now + gapMs, FOCUS_MIN, BREAK_MIN);
    expect(result.periodsCompleted).toBe(1);
    expect(result.lastCompletedMode).toBe('focus');
    expect(result.session.mode).toBe('break');
    expect(result.session.cyclesCompleted).toBe(1);
    expect(result.remainingMs).toBe(BREAK_MIN * 60 * 1000 - 30_000);
  });

  it('walks through multiple fully-elapsed periods in one call', () => {
    const now = 0;
    const session = startSession('focus', now, FOCUS_MIN, BREAK_MIN);
    // Boundaries from t=0: focus1 ends 25, break1 ends 30, focus2 ends 55,
    // break2 ends 60, focus3 ends 85. At t=65 we've crossed 4 boundaries
    // and are 5 minutes into focus3.
    const gapMs = 65 * 60 * 1000;
    const result = advanceSession(session, now + gapMs, FOCUS_MIN, BREAK_MIN);
    expect(result.periodsCompleted).toBe(4);
    expect(result.session.mode).toBe('focus');
    expect(result.session.cyclesCompleted).toBe(2);
    expect(result.remainingMs).toBe(20 * 60 * 1000); // 85 - 65
  });

  it('never returns negative remaining time even mid-transition', () => {
    const now = 0;
    const session = startSession('focus', now, FOCUS_MIN, BREAK_MIN);
    const result = advanceSession(session, now + 25 * 60 * 1000, FOCUS_MIN, BREAK_MIN);
    expect(result.remainingMs).toBeGreaterThanOrEqual(0);
  });

  it('is a no-op when called again at the same instant it just resolved to', () => {
    const now = 0;
    const session = startSession('focus', now, FOCUS_MIN, BREAK_MIN);
    const first = advanceSession(session, now + FOCUS_MIN * 60 * 1000, FOCUS_MIN, BREAK_MIN);
    const second = advanceSession(first.session, now + FOCUS_MIN * 60 * 1000, FOCUS_MIN, BREAK_MIN);
    expect(second.periodsCompleted).toBe(0);
    expect(second.session).toEqual(first.session);
  });
});

describe('buildPomodoroPushMessage', () => {
  it('describes a finished focus period as done, with a break-themed body', () => {
    const message = buildPomodoroPushMessage('focus');
    expect(message.title).toMatch(/focus/i);
    expect(message.body).toMatch(/break/i);
    expect(message.url).toBe('/');
  });

  it('describes a finished break as over, with a focus-themed body', () => {
    const message = buildPomodoroPushMessage('break');
    expect(message.title).toMatch(/break/i);
    expect(message.body).toMatch(/focus/i);
    expect(message.url).toBe('/');
  });
});
