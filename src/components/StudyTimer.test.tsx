// v5 regression coverage for the drift/stall bug fix — see plan.md's "v5
// revision note". Renders StudyTimer directly (no App/api mocking needed;
// it's entirely session-only, per spec.md story 10).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { StudyTimer } from './StudyTimer';

describe('StudyTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
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
    vi.unstubAllGlobals();
  });
});
