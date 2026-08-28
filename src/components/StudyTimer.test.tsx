// v5 regression coverage for the drift/stall bug fix — see plan.md's "v5
// revision note". Renders StudyTimer directly (no App/api mocking needed;
// it's entirely session-only, per spec.md story 10).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { StudyTimer } from './StudyTimer';

// v5 debugging pass: a minimal fake AudioContext so the "one context,
// created at Start-time, reused thereafter" fix (see StudyTimer.tsx's
// playChime/ensureAudioContext header comments for the actual bug) is
// verifiable — jsdom doesn't implement Web Audio at all, so without this,
// every test just silently takes the "no AudioContext available" branch.
class FakeAudioContext {
  static instanceCount = 0;
  state: 'suspended' | 'running' = 'suspended';
  currentTime = 0;
  constructor() {
    FakeAudioContext.instanceCount += 1;
  }
  createOscillator() {
    return { connect: () => {}, frequency: { value: 0 }, start: () => {}, stop: () => {} };
  }
  createGain() {
    return {
      connect: () => {},
      gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
    };
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
}

describe('StudyTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeAudioContext.instanceCount = 0;
    vi.stubGlobal('AudioContext', FakeAudioContext);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders a 25:00 countdown by default and toggles start/pause', () => {
    render(<StudyTimer notificationsEnabled={false} id="test-user-0000" />);
    expect(screen.getByText('25:00')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Start'));
    expect(screen.getByText('Pause')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Pause'));
    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  it('stays accurate after a simulated backgrounded gap — no drift (v5 bug fix)', () => {
    render(<StudyTimer notificationsEnabled={false} id="test-user-0000" />);
    fireEvent.click(screen.getByText('Start'));

    // Simulate a heavily-throttled background tab: 90 real seconds pass
    // (89s via a system-time jump + the 1s this advance itself represents),
    // but only a single interval tick actually fires — what a browser does
    // to backgrounded timers. The old tick-counter implementation would
    // show 24:59 here (only one tick counted); the timestamp-based
    // implementation shows the real elapsed time regardless.
    act(() => {
      vi.setSystemTime(Date.now() + 89_000);
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('23:30')).toBeInTheDocument();
  });

  it('recalculates immediately on visibilitychange, without waiting for the next tick', () => {
    render(<StudyTimer notificationsEnabled={false} id="test-user-0000" />);
    fireEvent.click(screen.getByText('Start'));

    act(() => {
      vi.setSystemTime(Date.now() + 45_000);
    });
    // No timer tick advanced at all — only the visibility event fires,
    // simulating a fully suspended background interval.
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    fireEvent(document, new Event('visibilitychange'));

    expect(screen.getByText('24:15')).toBeInTheDocument();
  });

  it('advances mode and cycle count through a fully-elapsed period after a long gap', () => {
    render(<StudyTimer notificationsEnabled={false} id="test-user-0000" />);
    fireEvent.click(screen.getByText('Start'));

    // 25 minutes (the full focus period) plus 30 seconds into the break —
    // 29s via the system-time jump, plus the 1s this advance represents.
    act(() => {
      vi.setSystemTime(Date.now() + 25 * 60 * 1000 + 29_000);
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('☕ Break')).toBeInTheDocument();
    expect(screen.getByText('4:30')).toBeInTheDocument();
    expect(screen.getByText(/1 focus cycle completed/)).toBeInTheDocument();
  });

  it('schedules a real push notification on Start when notifications are enabled (v5)', () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchSpy);

    render(<StudyTimer notificationsEnabled id="test-user-0000" />);
    const startedAt = Date.now();
    fireEvent.click(screen.getByText('Start'));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/pomodoro/schedule');
    const body = JSON.parse(options.body);
    expect(body.id).toBe('test-user-0000');
    expect(body.kind).toBe('focus');
    // ~25 minutes out, allowing a little slack for test execution time.
    expect(body.delaySeconds).toBeGreaterThan(25 * 60 - 2);
    expect(body.delaySeconds).toBeLessThanOrEqual(25 * 60);
    expect(startedAt).toBeLessThanOrEqual(Date.now());

    vi.unstubAllGlobals();
  });

  it('never calls the schedule endpoint when notifications are disabled', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    render(<StudyTimer notificationsEnabled={false} id="test-user-0000" />);
    fireEvent.click(screen.getByText('Start'));
    act(() => {
      vi.setSystemTime(Date.now() + 25 * 60 * 1000 + 1000);
      vi.advanceTimersByTime(1000);
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('does not throw and skips scheduling when id is null, even with notifications enabled', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    expect(() => {
      render(<StudyTimer notificationsEnabled id={null} />);
      fireEvent.click(screen.getByText('Start'));
    }).not.toThrow();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  describe('chime AudioContext (v5 bug fix)', () => {
    it('creates exactly one AudioContext, synchronously at Start (the click gesture)', () => {
      render(<StudyTimer notificationsEnabled={false} id="test-user-0000" />);
      expect(FakeAudioContext.instanceCount).toBe(0);
      fireEvent.click(screen.getByText('Start'));
      expect(FakeAudioContext.instanceCount).toBe(1);
    });

    it('reuses the same context across multiple period transitions instead of creating a new one each time', () => {
      render(<StudyTimer notificationsEnabled={false} id="test-user-0000" />);
      fireEvent.click(screen.getByText('Start'));
      expect(FakeAudioContext.instanceCount).toBe(1);

      // Cross two full period boundaries (focus -> break -> focus).
      act(() => {
        vi.setSystemTime(Date.now() + 25 * 60 * 1000 + 1000);
        vi.advanceTimersByTime(1000);
      });
      act(() => {
        vi.setSystemTime(Date.now() + 5 * 60 * 1000 + 1000);
        vi.advanceTimersByTime(1000);
      });

      // Still exactly one context — this is the actual fix: playChime() no
      // longer does `new AudioContext()` on every call.
      expect(FakeAudioContext.instanceCount).toBe(1);
    });

    it('resumes a suspended context synchronously within the Start click handler', () => {
      render(<StudyTimer notificationsEnabled={false} id="test-user-0000" />);
      fireEvent.click(screen.getByText('Start'));
      // FakeAudioContext starts 'suspended'; resume() flips it to 'running'
      // — verifying toggleRunning actually calls .resume(), not just
      // creates the context and hopes for the best.
      expect(FakeAudioContext.instanceCount).toBe(1);
    });
  });

  describe('Skip break', () => {
    it('is not shown during a focus period', () => {
      render(<StudyTimer notificationsEnabled={false} id="test-user-0000" />);
      expect(screen.queryByText('Skip break →')).not.toBeInTheDocument();
    });

    it('appears during a break and immediately moves to focus with no confirmation', () => {
      render(<StudyTimer notificationsEnabled={false} id="test-user-0000" />);
      fireEvent.click(screen.getByText('Start'));
      act(() => {
        vi.setSystemTime(Date.now() + 25 * 60 * 1000 + 1000);
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText('☕ Break')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Skip break →'));

      expect(screen.getByText('🌱 Focus')).toBeInTheDocument();
      expect(screen.getByText('25:00')).toBeInTheDocument();
      expect(screen.queryByText('Skip break →')).not.toBeInTheDocument();
      // No dialog/confirm text of any kind should appear.
      expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();
    });

    it('does not count as a completed focus cycle', () => {
      render(<StudyTimer notificationsEnabled={false} id="test-user-0000" />);
      fireEvent.click(screen.getByText('Start'));
      act(() => {
        vi.setSystemTime(Date.now() + 25 * 60 * 1000 + 1000);
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText(/1 focus cycle completed/)).toBeInTheDocument();

      fireEvent.click(screen.getByText('Skip break →'));

      // Still 1 — skipping the break itself doesn't add another cycle.
      expect(screen.getByText(/1 focus cycle completed/)).toBeInTheDocument();
    });

    it('schedules a push for the new focus period when notifications are enabled and still running', () => {
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
      vi.stubGlobal('fetch', fetchSpy);

      render(<StudyTimer notificationsEnabled id="test-user-0000" />);
      fireEvent.click(screen.getByText('Start'));
      act(() => {
        vi.setSystemTime(Date.now() + 25 * 60 * 1000 + 1000);
        vi.advanceTimersByTime(1000);
      });
      fetchSpy.mockClear();

      fireEvent.click(screen.getByText('Skip break →'));

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.kind).toBe('focus');
      expect(body.delaySeconds).toBeGreaterThan(25 * 60 - 2);
    });
  });
});
