// Traces to spec.md story 10 (v5 revision — fixes the Study Timer drifting
// or stalling on a backgrounded tab). Pure, unit-tested timer math: the
// source of truth is real clock timestamps (when the current period ends),
// never a decrementing tick counter, so the displayed time is always
// correct however long a tab was throttled or suspended — see
// StudyTimer.tsx for how this gets called from setInterval + a
// visibilitychange listener, and plan.md's "v5 revision note" for why.

export type PomodoroMode = 'focus' | 'break';

export interface PomodoroSession {
  mode: PomodoroMode;
  endAt: number; // epoch ms the current period ends at
  cyclesCompleted: number;
}

export function periodDurationMs(mode: PomodoroMode, focusMin: number, breakMin: number): number {
  return (mode === 'focus' ? focusMin : breakMin) * 60 * 1000;
}

export function startSession(
  mode: PomodoroMode,
  now: number,
  focusMin: number,
  breakMin: number,
  cyclesCompleted = 0,
): PomodoroSession {
  return { mode, endAt: now + periodDurationMs(mode, focusMin, breakMin), cyclesCompleted };
}

export interface AdvanceResult {
  session: PomodoroSession;
  remainingMs: number;
  periodsCompleted: number; // how many focus/break periods fully elapsed this call
  lastCompletedMode: PomodoroMode | null; // the mode that just finished, for chime/notification copy
}

const MAX_PERIODS_PER_ADVANCE = 10000; // safety valve against a runaway loop, never expected to bind

// Advances `session` to instant `now`, walking through any fully-elapsed
// periods (e.g. after a long-backgrounded tab) rather than clamping to
// zero, so mode and cyclesCompleted stay correct even after a large gap.
export function advanceSession(
  session: PomodoroSession,
  now: number,
  focusMin: number,
  breakMin: number,
): AdvanceResult {
  let { mode, endAt, cyclesCompleted } = session;
  let periodsCompleted = 0;
  let lastCompletedMode: PomodoroMode | null = null;

  while (now >= endAt && periodsCompleted < MAX_PERIODS_PER_ADVANCE) {
    lastCompletedMode = mode;
    if (mode === 'focus') {
      cyclesCompleted += 1;
      mode = 'break';
    } else {
      mode = 'focus';
    }
    endAt += periodDurationMs(mode, focusMin, breakMin);
    periodsCompleted += 1;
  }

  return {
    session: { mode, endAt, cyclesCompleted },
    remainingMs: Math.max(0, endAt - now),
    periodsCompleted,
    lastCompletedMode,
  };
}

export interface PomodoroPushMessage {
  title: string;
  body: string;
  url: string;
}

// Shared copy for the period-end push notification — imported by both
// api/pomodoro/notify.ts (server) and, indirectly, matches the same
// wording used for the in-app visual state. `finishedMode` is the period
// that just ended (what the notification is about), not the one starting.
export function buildPomodoroPushMessage(finishedMode: PomodoroMode): PomodoroPushMessage {
  return finishedMode === 'focus'
    ? { title: 'Focus session done 🌱', body: 'Nice work — take your break.', url: '/' }
    : { title: "Break's over ☕→🌱", body: 'Ready for another focus round?', url: '/' };
}
