// Resolves a user identity in the order documented in plan.md "Identity &
// routing": /u/:id in the URL, then the cookie, then mint a new one.

import { useEffect, useRef, useState } from 'react';
import { parseIdFromPath, getCookie, setCookie } from '../lib/identity';
import { createIdentity } from '../lib/api';

export function useIdentity(): { id: string | null } {
  const [id, setId] = useState<string | null>(null);
  const resolvedOnce = useRef(false);

  useEffect(() => {
    if (resolvedOnce.current) return;
    resolvedOnce.current = true;

    const urlId = parseIdFromPath(window.location.pathname);
    if (urlId) {
      setCookie(urlId);
      window.history.replaceState(null, '', '/');
      setId(urlId);
      return;
    }

    const cookieId = getCookie();
    if (cookieId) {
      setId(cookieId);
      return;
    }

    createIdentity()
      .then(({ id: newId }) => {
        setCookie(newId);
        setId(newId);
      })
      .catch((err) => {
        console.warn('[sprout] Failed to create a new identity.', err);
      });
  }, []);

  return { id };
}
