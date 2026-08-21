// Traces to spec.md story 10: a Pomodoro-style focus timer. Entirely
// session-only React state — no useUserData/backend involvement at all
// (see constitution.md's "Data safety" section and plan.md's "v3 revision
// note" for why that's deliberate). Preferred lengths persist to
// localStorage as a nice-to-have, guarded try/catch per the constitution's
// fail-soft principle — this is exactly the "genuinely ephemeral UI state"
// localStorage is still allowed for.

import { useEffect, useRef, useState } from 'react';

const DEFAULT_FOCUS_MIN = 25;
const DEFAULT_BREAK_MIN = 5;
const PREFS_KEY = 'sprout_timer_prefs';

type Mode = 'focus' | 'break';

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

export function StudyTimer() {
  const initialPrefs = useRef(loadPrefs());
  const [focusMin, setFocusMin] = useState(initialPrefs.current.focusMin);
  const [breakMin, setBreakMin] = useState(initialPrefs.current.breakMin);
  const [mode, setMode] = useState<Mode>('focus');
  const [secondsLeft, setSecondsLeft] = useState(initialPrefs.current.focusMin * 60);
  const [running, setRunning] = useState(false);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [justFinished, setJustFinished] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (secondsLeft > 0) return;
    setRunning(false);
    playChime();
    setJustFinished(true);
    const t = setTimeout(() => setJustFinished(false), 1500);
    if (mode === 'focus') {
      setCyclesCompleted((c) => c + 1);
      setMode('break');
      setSecondsLeft(breakMin * 60);
    } else {
      setMode('focus');
      setSecondsLeft(focusMin * 60);
    }
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const totalSeconds = (mode === 'focus' ? focusMin : breakMin) * 60;
  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;

  const toggleRunning = () => setRunning((r) => !r);

  const reset = () => {
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
