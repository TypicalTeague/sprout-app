import { describe, it, expect } from 'vitest';
import { parseIdFromPath, readCookie, buildCookieString } from './identity';

describe('parseIdFromPath', () => {
  it('extracts an id from a /u/:id path', () => {
    expect(parseIdFromPath('/u/abc123def456')).toBe('abc123def456');
  });

  it('returns null for the root path', () => {
    expect(parseIdFromPath('/')).toBeNull();
  });

  it('returns null for an unrelated path', () => {
    expect(parseIdFromPath('/settings')).toBeNull();
  });

  it('returns null for a too-short id (rejects junk paths)', () => {
    expect(parseIdFromPath('/u/x')).toBeNull();
  });
});

describe('readCookie', () => {
  it('reads a named cookie out of a cookie string', () => {
    expect(readCookie('foo=bar; sprout_uid=abc-123; other=1')).toBe('abc-123');
  });

  it('returns null when the cookie is absent', () => {
    expect(readCookie('foo=bar')).toBeNull();
  });

  it('handles an empty cookie string', () => {
    expect(readCookie('')).toBeNull();
  });

  it('URL-decodes the value', () => {
    expect(readCookie('sprout_uid=abc%2D123')).toBe('abc-123');
  });
});

describe('buildCookieString', () => {
  it('includes the value, a long Max-Age, and Path=/', () => {
    const cookie = buildCookieString('abc-123');
    expect(cookie).toContain('sprout_uid=abc-123');
    expect(cookie).toContain('Path=/');
    expect(cookie).toMatch(/Max-Age=\d+/);
  });
});
