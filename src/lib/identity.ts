// Traces to constitution.md "Persistence & identity" and spec.md story 6.
// Pure-ish helpers (cookie/URL parsing) kept separate from side effects so
// the resolution logic is unit testable.

const COOKIE_NAME = 'sprout_uid';
const COOKIE_DAYS = 3650; // ~10 years — "effectively permanent"
const URL_ID_PATTERN = /^\/u\/([a-zA-Z0-9-]{8,100})$/;

export function parseIdFromPath(pathname: string): string | null {
  const match = URL_ID_PATTERN.exec(pathname);
  return match ? match[1] : null;
}

export function readCookie(cookieString: string, name: string = COOKIE_NAME): string | null {
  const parts = cookieString.split(';').map((p) => p.trim());
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq) === name) {
      return decodeURIComponent(part.slice(eq + 1));
    }
  }
  return null;
}

export function buildCookieString(
  value: string,
  name: string = COOKIE_NAME,
  days: number = COOKIE_DAYS,
): string {
  const maxAge = days * 24 * 60 * 60;
  return `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
}

export function setCookie(value: string): void {
  document.cookie = buildCookieString(value);
}

export function getCookie(): string | null {
  return readCookie(document.cookie);
}

export function privateUrl(id: string): string {
  return `${window.location.origin}/u/${id}`;
}
