// Pure store logic, dependency-injected on a KV client so it's unit
// testable without a real Redis instance. api/*.ts is a thin adapter over
// this module (constitution.md: "small typed data-access module").

import type { UserData, UserDataInput } from '../types/userData.js';

export interface KVClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

function userKey(id: string): string {
  return `user:${id}`;
}

export function createEmptyUserData(id: string): UserData {
  return {
    id,
    name: null,
    classes: [],
    assignments: [],
    onboardingDismissed: false,
    linkNoticeDismissed: false,
    pushSubscription: null,
    timeZone: null,
    updatedAt: new Date().toISOString(),
  };
}

// Story 6: a brand-new identity, never a seeded/example one.
export async function createIdentity(kv: KVClient, id: string): Promise<UserData> {
  const data = createEmptyUserData(id);
  await kv.set(userKey(id), JSON.stringify(data));
  return data;
}

export async function getUserData(kv: KVClient, id: string): Promise<UserData | null> {
  const raw = await kv.get(userKey(id));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as UserData;
    // Defensive defaults in case of a future schema widen — pushSubscription
    // and timeZone (v4) default to null exactly the same way, for every
    // record that predates them.
    return {
      id,
      name: parsed.name ?? null,
      classes: Array.isArray(parsed.classes) ? parsed.classes : [],
      assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
      onboardingDismissed: Boolean(parsed.onboardingDismissed),
      linkNoticeDismissed: Boolean(parsed.linkNoticeDismissed),
      pushSubscription: parsed.pushSubscription ?? null,
      timeZone: parsed.timeZone ?? null,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// Upsert: a PUT for an unknown id still succeeds rather than requiring a
// separate create step (plan.md API surface rationale).
export async function saveUserData(
  kv: KVClient,
  id: string,
  input: UserDataInput,
): Promise<UserData> {
  const data: UserData = {
    id,
    name: input.name ?? null,
    classes: input.classes ?? [],
    assignments: input.assignments ?? [],
    onboardingDismissed: Boolean(input.onboardingDismissed),
    linkNoticeDismissed: Boolean(input.linkNoticeDismissed),
    pushSubscription: input.pushSubscription ?? null,
    timeZone: input.timeZone ?? null,
    updatedAt: new Date().toISOString(),
  };
  await kv.set(userKey(id), JSON.stringify(data));
  return data;
}
