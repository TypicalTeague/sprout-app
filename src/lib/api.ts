// Client fetch wrappers — the only place in client code that talks to
// /api. hooks/useUserData.ts and hooks/useIdentity.ts are the only callers
// (constitution.md data-access boundary).

import type { UserData, UserDataInput } from '../types/userData';

export async function createIdentity(): Promise<{ id: string }> {
  const res = await fetch('/api/identity', { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to create identity: ${res.status}`);
  return res.json();
}

export async function fetchUserData(id: string): Promise<UserData | null> {
  const res = await fetch(`/api/data/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch user data: ${res.status}`);
  return res.json();
}

export async function saveUserData(id: string, input: UserDataInput): Promise<UserData> {
  const res = await fetch(`/api/data/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Failed to save user data: ${res.status}`);
  return res.json();
}
