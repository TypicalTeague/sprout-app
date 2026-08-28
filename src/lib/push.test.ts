import { describe, it, expect, vi, afterEach } from 'vitest';
import { schedulePomodoroPush } from './push';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('schedulePomodoroPush', () => {
  it('POSTs the id, kind, and a delay computed from the given endAt', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchSpy);

    await schedulePomodoroPush('user-123', 1_000_000 + 90_000, 'break');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/pomodoro/schedule');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual({ id: 'user-123', kind: 'break', delaySeconds: 90 });
  });

  it('clamps a past/immediate endAt to at least 1 second, never a negative delay', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchSpy);

    await schedulePomodoroPush('user-123', 1_000_000 - 5000, 'focus');

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.delaySeconds).toBe(1);
  });

  it('fails soft — never throws when the network call rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down')),
    );

    await expect(schedulePomodoroPush('user-123', Date.now() + 60_000, 'focus')).resolves.toBeUndefined();
  });

  it('logs a warning (does not silently swallow) a 200 response with ok:false in the body', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: false, reason: 'not_configured' }),
      }),
    );

    await schedulePomodoroPush('user-123', Date.now() + 60_000, 'focus');

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('did not succeed'),
      expect.objectContaining({ body: { ok: false, reason: 'not_configured' } }),
    );
    warnSpy.mockRestore();
  });

  it('logs a warning on a non-2xx HTTP response', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
    );

    await schedulePomodoroPush('user-123', Date.now() + 60_000, 'focus');

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('did not succeed'),
      expect.objectContaining({ status: 500 }),
    );
    warnSpy.mockRestore();
  });
});
