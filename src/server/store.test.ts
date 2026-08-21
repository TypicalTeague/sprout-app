import { describe, it, expect } from 'vitest';
import type { KVClient } from './store';
import { createIdentity, getUserData, saveUserData, createEmptyUserData } from './store';
import type { UserDataInput } from '../types/userData';

function fakeKV(): KVClient {
  const map = new Map<string, string>();
  return {
    async get(key) {
      return map.get(key) ?? null;
    },
    async set(key, value) {
      map.set(key, value);
    },
  };
}

describe('createIdentity', () => {
  it('creates a brand-new, empty record (no seed data)', async () => {
    const kv = fakeKV();
    const data = await createIdentity(kv, 'abc-123');
    expect(data.id).toBe('abc-123');
    expect(data.name).toBeNull();
    expect(data.classes).toEqual([]);
    expect(data.assignments).toEqual([]);
    expect(data.onboardingDismissed).toBe(false);
  });

  it('is retrievable immediately after creation', async () => {
    const kv = fakeKV();
    await createIdentity(kv, 'abc-123');
    const fetched = await getUserData(kv, 'abc-123');
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe('abc-123');
  });
});

describe('getUserData', () => {
  it('returns null for an unknown id', async () => {
    const kv = fakeKV();
    const result = await getUserData(kv, 'does-not-exist');
    expect(result).toBeNull();
  });

  it('returns null instead of throwing on corrupted data', async () => {
    const kv = fakeKV();
    await kv.set('user:corrupt', 'not valid json {{{');
    const result = await getUserData(kv, 'corrupt');
    expect(result).toBeNull();
  });

  it('defaults pushSubscription and timeZone to null for a pre-v4 record that never had those keys (data safety)', async () => {
    const kv = fakeKV();
    // Simulates a real record written before v4 — no pushSubscription/timeZone
    // key at all, not even `null`. Existing production data looks like this.
    const preV4Record = {
      id: 'legacy-user',
      name: 'Julia',
      classes: [{ id: 'c1', name: 'BIO 201' }],
      assignments: [
        {
          id: 'a1',
          title: 'Midterm',
          classId: 'c1',
          dueDate: '2026-09-01',
          type: 'exam',
          done: false,
          createdAt: '2026-08-16T00:00:00.000Z',
        },
      ],
      onboardingDismissed: true,
      linkNoticeDismissed: true,
      updatedAt: '2026-08-16T00:00:00.000Z',
    };
    await kv.set('user:legacy-user', JSON.stringify(preV4Record));
    const result = await getUserData(kv, 'legacy-user');
    expect(result?.pushSubscription).toBeNull();
    expect(result?.timeZone).toBeNull();
    // and nothing pre-existing was altered
    expect(result?.name).toBe('Julia');
    expect(result?.classes).toEqual(preV4Record.classes);
    expect(result?.assignments).toEqual(preV4Record.assignments);
  });
});

describe('saveUserData', () => {
  const sampleInput: UserDataInput = {
    name: 'Julia',
    classes: [{ id: 'c1', name: 'BIO 201' }],
    assignments: [
      {
        id: 'a1',
        title: 'Midterm',
        classId: 'c1',
        dueDate: '2026-09-01',
        type: 'exam',
        done: false,
        createdAt: '2026-08-16T00:00:00.000Z',
      },
    ],
    onboardingDismissed: true,
    linkNoticeDismissed: false,
    pushSubscription: null,
    timeZone: null,
  };

  it('round-trips data correctly through save and get', async () => {
    const kv = fakeKV();
    await saveUserData(kv, 'u1', sampleInput);
    const fetched = await getUserData(kv, 'u1');
    expect(fetched?.name).toBe('Julia');
    expect(fetched?.classes).toEqual(sampleInput.classes);
    expect(fetched?.assignments).toEqual(sampleInput.assignments);
    expect(fetched?.onboardingDismissed).toBe(true);
  });

  it('round-trips a push subscription and timezone (story 12)', async () => {
    const kv = fakeKV();
    const withPush: UserDataInput = {
      ...sampleInput,
      pushSubscription: {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
        keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
      },
      timeZone: 'America/New_York',
    };
    await saveUserData(kv, 'u1', withPush);
    const fetched = await getUserData(kv, 'u1');
    expect(fetched?.pushSubscription).toEqual(withPush.pushSubscription);
    expect(fetched?.timeZone).toBe('America/New_York');
  });

  it('upserts — succeeds even for an id with no prior record', async () => {
    const kv = fakeKV();
    const saved = await saveUserData(kv, 'brand-new', sampleInput);
    expect(saved.id).toBe('brand-new');
    const fetched = await getUserData(kv, 'brand-new');
    expect(fetched).not.toBeNull();
  });

  it('stamps a fresh updatedAt on every save', async () => {
    const kv = fakeKV();
    const first = await saveUserData(kv, 'u1', sampleInput);
    const second = await saveUserData(kv, 'u1', { ...sampleInput, name: 'Renamed' });
    expect(second.updatedAt).not.toBe(undefined);
    expect(second.name).toBe('Renamed');
    expect(first.id).toBe(second.id);
  });
});

describe('createEmptyUserData', () => {
  it('produces an empty, non-seeded record', () => {
    const data = createEmptyUserData('x');
    expect(data.assignments).toEqual([]);
    expect(data.classes).toEqual([]);
    expect(data.name).toBeNull();
    expect(data.pushSubscription).toBeNull();
    expect(data.timeZone).toBeNull();
  });
});
