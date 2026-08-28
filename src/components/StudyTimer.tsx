// Traces to spec.md story 10: a Pomodoro-style focus timer. Session-only
// React state for the timer itself — no useUserData/backend involvement
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
//
// v5, corrected: period-end notifications are now a real, server-sent
// push (scheduled via lib/push.ts's schedulePomodoroPush, delivered by
// Upstash QStash) rather than a notification this tab's own JS would have
// to trigger itself — the latter can't reliably fire while the phone is
// locked, for the exact same reason a JS-triggered sound can't. This is
// the one narrow exception to "no backend involvement": StudyTimer makes
// a fire-and-forget scheduling call when notifications are enabled, but
// still never reads or mutates her assignment/class data, and never calls
// useUserData. The in-app chime below is unrelated and unconditional —
// it's the separate, always-on cue for when she's actively looking at the
// tab, per story 10's original "gentle sound and/or visual cue" ask.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PomodoroMode } from '../lib/pomodoro';
import { advanceSession } from '../lib/pomodoro';
import { schedulePomodoroPush } from '../lib/push';

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

// v5 debugging pass, bug fix: this used to create a brand-new AudioContext
// on every call. That's the actual reason the chime was silent — a
// *freshly created* AudioContext starts `suspended` unless creation (or an
// explicit .resume()) happens synchronously inside a user-gesture handler
// (a click), and playChime() was only ever called from inside a
// setInterval/visibilitychange callback, minutes after the Start tap that
// triggered the session — nowhere near a gesture. A suspended context's
// oscillator produces no audible sound and throws no error, so this failed
// completely silently. Fixed by creating (and warming) exactly one
// AudioContext, synchronously inside the Start/Resume click handler (see
// ensureAudioContext below and its call site in toggleRunning), and
// reusing that same already-unlocked context for every chime thereafter.
function playChime(ctx: AudioContext) {
  try {
    console.log('[sprout] playChime: AudioContext state before play =', ctx.state);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch (err) {
    // A missed chime is never worth crashing the timer over, but it's
    // worth logging so a silent failure like the one above is diagnosable
    // next time instead of just "no sound, no idea why."
    console.warn('[sprout] chime playback failed', err);
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
  // v5: her identity, needed only to address a scheduled push at delivery
  // time (see lib/push.ts's schedulePomodoroPush) — never used to read or
  // write her assignment/class data.
  id: string | null;
}

export function StudyTimer({ notificationsEnabled, id }: StudyTimerProps) {
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

  // One AudioContext, created once and reused for the component's
  // lifetime — see playChime's header comment above for why a fresh
  // context per chime was the actual bug.
  const audioCtxRef = useRef<AudioContext | null>(null);

  const ensureAudioContext = useCallback((): AudioContext | null => {
    if (audioCtxRef.current) return audioCtxRef.current;
    try {
      type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };
      const Ctx = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
      if (!Ctx) {
        console.warn('[sprout] Web Audio unavailable — chime disabled this session');
        return null;
      }
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      console.log('[sprout] AudioContext created, initial state =', ctx.state);
      return ctx;
    } catch (err) {
      console.warn('[sprout] failed to create AudioContext', err);
      return null;
    }
  }, []);

  const tick = useCallback(() => {
    if (!running || endAtRef.current == null) return;
    const now = Date.now();
    const result = advanceSession({ mode, endAt: endAtRef.current, cyclesCompleted }, now, focusMin, breakMin);
    endAtRef.current = result.session.endAt;
    setSecondsLeft(Math.round(result.remainingMs / 1000));
    if (result.periodsCompleted > 0) {
      console.log('[sprout] Pomodoro period ended', {
        lastCompletedMode: result.lastCompletedMode,
        newMode: result.session.mode,
        cyclesCompleted: result.session.cyclesCompleted,
      });
      setMode(result.session.mode);
      setCyclesCompleted(result.session.cyclesCompleted);
      const ctx = audioCtxRef.current;
      if (ctx) {
        playChime(ctx);
      } else {
        console.warn('[sprout] no warmed AudioContext available — chime skipped (Start/Resume should have created one)');
      }
      setJustFinished(true);
      // Still running into the next period — schedule its push too, so a
      // multi-cycle session keeps getting notified as long as the tab had
      // at least this one moment of execution to observe the transition
      // and schedule ahead (see the header comment above and plan.md's
      // "v5 revision note" for the bounded nature of that guarantee).
      if (notificationsEnabled && id) {
        schedulePomodoroPush(id, result.session.endAt, result.session.mode);
      }
    }
  }, [running, mode, cyclesCompleted, focusMin, breakMin, notificationsEnabled, id]);

  useEffect(() => {
    if (!running) return;
    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
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
      // Create/warm the AudioContext synchronously, right here in the
      // click handler — this is the one moment guaranteed to count as a
      // user gesture, which is what lets the context actually unlock
      // (see playChime's header comment for why that matters).
      const ctx = ensureAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx
          .resume()
          .then(() => console.log('[sprout] AudioContext resumed, state =', ctx.state))
          .catch((err) => console.warn('[sprout] AudioContext.resume() failed', err));
      }

      const endAt = Date.now() + secondsLeft * 1000;
      endAtRef.current = endAt;
      setRunning(true);
      // Not cancelled on Pause/Reset (see the header comment above) — a
      // deliberate simplification. Pausing and resuming this same period
      // schedules a second, correctly-timed push alongside the original
      // now-stale one, so an occasional early/duplicate notification is
      // possible after a pause; this is an accepted trade-off, not a bug.
      if (notificationsEnabled && id) {
        schedulePomodoroPush(id, endAt, mode);
      }
    }
  };

  const reset = () => {
    endAtRef.current = null;
    setRunning(false);
    setSecondsLeft((mode === 'focus' ? focusMin : breakMin) * 60);
  };

  // Skips the current break and moves straight into a focus period — no
  // confirmation, no prompt, just an immediate switch (per the explicit
  // ask: it should behave like a light switch, present but silent unless
  // used). Only reachable while mode === 'break' (the button itself is
  // conditionally rendered), so this never touches a focus period. Doesn't
  // count as a completed cycle — only a finished *focus* period does that,
  // unchanged from the existing rule.
  const skipBreak = () => {
    if (mode !== 'break') return;
    const newEndAt = running ? Date.now() + focusMin * 60 * 1000 : null;
    endAtRef.current = newEndAt;
    setMode('focus');
    setSecondsLeft(focusMin * 60);
    if (running && notificationsEnabled && id && newEndAt) {
      schedulePomodoroPush(id, newEndAt, 'focus');
    }
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
        {mode === 'break' && (
          <button className="btn-ghost btn-small skip-break-btn" onClick={skipBreak}>
            Skip break →
          </button>
        )}
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
