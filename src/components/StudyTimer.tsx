// Traces to spec.md story 10: a Pomodoro-style focus timer. Entirely
// session-only React state — no useUserData/backend involvement at all
// (see constitution.md's "Data safety" section and plan.md's "v3 revision
// note" for why that's deliberate). Preferred lengths persist to
// localStorage as a nice-to-have, guarded try/catch per the constitution's
// fail-soft principle — this is exactly the "genuinely ephemeral UI state"
// localStorage is still allowed for.
//
// v5: the countdown is driven by real clock timestamps (lib/pomodoro.ts),
// not a decrementing tick counter, so it can't drift or stall when the tab
// is backgrounded/throttled — see plan.md's "v5 revision note". A
// visibilitychange listener forces an immediate recalculation the moment
// the tab is foregrounded again, so the display snaps to correct instead
// of visibly catching up.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PomodoroMode } from '../lib/pomodoro';
import { advanceSession } from '../lib/pomodoro';
import { showLocalNotification } from '../lib/push';

const DEFAULT_FOCUS_MIN = 25;
const DEFAULT_BREAK_MIN = 5;
const PREFS_KEY = 'sprout_timer_prefs';

function loadPrefs(): { focusMin: number; breakMin: number } {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { focusMin: DEFAULT_FOCUS_MIN, breakMin: DEFAULT_BREAK_MIN };
    const parsed = JSON.parse(raw);
    const focusMin = Number(parsed.focusMin);
    const breakMin = Number(parsed.breakMin);
    return {
      focusMin: Number.isFinite(focusMin) && focusMin > 0 ? focusMin : DEFAULT_FOCUS_MIN,
      breakMin: Number.isFinite(breakMin) && breakMin > 0 ? breakMin : DEFAULT_BREAK_MIN,
    };
  } catch {
    return { focusMin: DEFAULT_FOCUS_MIN, breakMin: DEFAULT_BREAK_MIN };
  }
}

function savePrefs(focusMin: number, breakMin: number) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ focusMin, breakMin }));
  } catch {
    // Preference persistence is a nice-to-have — never let it break the timer.
  }
}

function playChime() {
  try {
    type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };
    const Ctx = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // A missed chime is never worth crashing the timer over.
  }
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface StudyTimerProps {
  // v5: her existing opt-in from Settings (story 12) — StudyTimer never
  // touches useUserData itself, this is a read-only flag handed down so a
  // period-end notification never fires without her having already turned
  // notifications on, and never fires a permission prompt of its own.
  notificationsEnabled: boolean;
}

export function StudyTimer({ notificationsEnabled }: StudyTimerProps) {
  const initialPrefs = useRef(loadPrefs());
  const [focusMin, setFocusMin] = useState(initialPrefs.current.focusMin);
  const [breakMin, setBreakMin] = useState(initialPrefs.current.breakMin);
  const [mode, setMode] = useState<PomodoroMode>('focus');
  const [secondsLeft, setSecondsLeft] = useState(initialPrefs.current.focusMin * 60);
  const [running, setRunning] = useState(false);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [justFinished, setJustFinished] = useState(false);

  // Epoch ms the current running period ends at — the actual source of
  // truth while running; null while paused/not started. Recomputed against
  // the real clock on every tick, never trusted as an incrementing counter,
  // which is what let the old implementation drift/stall on a
  // backgrounded tab (v5 bug fix — see plan.md's "v5 revision note").
  const endAtRef = useRef<number | null>(null);

  const tick = useCallback(() => {
    if (!running || endAtRef.current == null) return;
    const now = Date.now();
    const result = advanceSession({ mode, endAt: endAtRef.current, cyclesCompleted }, now, focusMin, breakMin);
    endAtRef.current = result.session.endAt;
    setSecondsLeft(Math.round(result.remainingMs / 1000));
    if (result.periodsCompleted > 0) {
      setMode(result.session.mode);
      setCyclesCompleted(result.session.cyclesCompleted);
      playChime();
      setJustFinished(true);
      if (notificationsEnabled && document.hidden && result.lastCompletedMode) {
        const finishedFocus = result.lastCompletedMode === 'focus';
        showLocalNotification(
          finishedFocus ? 'Focus session done 🌱' : "Break's over ☕→🌱",
          finishedFocus ? 'Nice work — take your break.' : 'Ready for another focus round?',
        );
      }
    }
  }, [running, mode, cyclesCompleted, focusMin, breakMin, notificationsEnabled]);

  useEffect(() => {
    if (!running) return;
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [running, tick]);

  // The moment the tab is foregrounded again, recalculate immediately
  // instead of waiting for the next 1s tick — this is what makes the
  // display snap to correct rather than visibly counting up to catch up.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [tick]);

  useEffect(() => {
    if (!justFinished) return;
    const t = setTimeout(() => setJustFinished(false), 1500);
    return () => clearTimeout(t);
  }, [justFinished]);

  const totalSeconds = (mode === 'focus' ? focusMin : breakMin) * 60;
  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;

  const toggleRunning = () => {
    if (running) {
      if (endAtRef.current != null) {
        setSecondsLeft(Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000)));
      }
      endAtRef.current = null;
      setRunning(false);
    } else {
      endAtRef.current = Date.now() + secondsLeft * 1000;
      setRunning(true);
    }
  };

  const reset = () => {
    endAtRef.current = null;
    setRunning(false);
    setSecondsLeft((mode === 'focus' ? focusMin : breakMin) * 60);
  };

  const handleFocusMinChange = (value: number) => {
    const next = Math.min(180, Math.max(1, Math.round(value)));
    setFocusMin(next);
    savePrefs(next, breakMin);
    if (!running && mode === 'focus') setSecondsLeft(next * 60);
  };

  const handleBreakMinChange = (value: number) => {
    const next = Math.min(60, Math.max(1, Math.round(value)));
    setBreakMin(next);
    savePrefs(focusMin, next);
    if (!running && mode === 'break') setSecondsLeft(next * 60);
  };

  return (
    <div className="board timer-page">
      <div className="timer-head">
        <h2>Study Timer</h2>
        <p className="sub">Focus, then breathe. Default is 25 minutes on, 5 minutes off.</p>
      </div>

      <div className={`timer-display-wrap ${justFinished ? 'timer-pulse' : ''}`}>
        <div className={`timer-mode-badge mode-${mode}`}>
          {mode === 'focus' ? '🌱 Focus' : '☕ Break'}
        </div>
        <div className="timer-display">{formatTime(secondsLeft)}</div>
        <div className="timer-progress-track">
          <div
            className={`timer-progress-fill mode-${mode}`}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>

      <div className="timer-controls">
        <button className="btn-primary" onClick={toggleRunning}>
          {running ? 'Pause' : secondsLeft === totalSeconds ? 'Start' : 'Resume'}
        </button>
        <button className="btn-ghost" onClick={reset}>
          Reset
        </button>
      </div>

      <div className="timer-cycle-count">
        🍅 {cyclesCompleted} focus {cyclesCompleted === 1 ? 'cycle' : 'cycles'} completed this session
      </div>

      <div className="timer-prefs">
        <div className="field">
          <label htmlFor="tFocusMin">Focus length (minutes)</label>
          <input
            id="tFocusMin"
            type="number"
            min={1}
            max={180}
            value={focusMin}
            disabled={running}
            onChange={(e) => handleFocusMinChange(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="tBreakMin">Break length (minutes)</label>
          <input
            id="tBreakMin"
            type="number"
            min={1}
            max={60}
            value={breakMin}
            disabled={running}
            onChange={(e) => handleBreakMinChange(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
