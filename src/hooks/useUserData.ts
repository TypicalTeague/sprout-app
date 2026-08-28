// Traces to spec.md stories 4-9 and plan.md's useUserData interface.
// Replaces v1's useAssignments. Optimistic local state, immediate PUT on
// every mutation (no debounce — the whole blob is tiny; simplicity over
// micro-optimizing write frequency, per constitution).

import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Assignment, NewAssignmentInput } from '../types/assignment';
import type { ClassColor, ClassEntry, UserData } from '../types/userData';
import type { PushSubscriptionData } from '../types/push';
import { createEmptyUserData } from '../server/store';
import * as api from '../lib/api';

function resolveClassId(
  classes: ClassEntry[],
  className: string | undefined,
): { classId: string | null; classes: ClassEntry[] } {
  const trimmed = className?.trim();
  if (!trimmed) return { classId: null, classes };

  const existing = classes.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) return { classId: existing.id, classes };

  const created: ClassEntry = { id: uuidv4(), name: trimmed };
  return { classId: created.id, classes: [...classes, created] };
}

export function useUserData(id: string | null) {
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    api
      .fetchUserData(id)
      .then((fetched) => {
        if (cancelled) return;
        setData(fetched ?? createEmptyUserData(id));
      })
      .catch((err) => {
        console.warn('[sprout] Failed to load user data, starting from an empty state.', err);
        if (!cancelled) setData(createEmptyUserData(id));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // v5 debugging pass: persist() now resolves `true`/`false` rather than
  // being purely fire-and-forget, and logs both outcomes (not just
  // failure). Most mutators still don't await it — the whole point of
  // "optimistic, no debounce" is not waiting on the network — but
  // setPushSubscription below does, specifically because a save that
  // silently fails there means notifications quietly stop working with
  // no visible symptom until someone goes looking, which is exactly the
  // class of bug this pass is closing.
  const persist = useCallback(
    (next: UserData): Promise<boolean> => {
      if (!id) return Promise.resolve(false);
      return api
        .saveUserData(id, {
          name: next.name,
          classes: next.classes,
          assignments: next.assignments,
          onboardingDismissed: next.onboardingDismissed,
          linkNoticeDismissed: next.linkNoticeDismissed,
          pushSubscription: next.pushSubscription,
          timeZone: next.timeZone,
        })
        .then(() => {
          console.log('[sprout] saved user data', { id, hasPushSubscription: next.pushSubscription != null });
          return true;
        })
        .catch((err) => {
          console.warn('[sprout] Failed to save changes — they may not survive a reload.', err);
          return false;
        });
    },
    [id],
  );

  const update = useCallback(
    (fn: (prev: UserData) => UserData): Promise<boolean> => {
      let result: Promise<boolean> = Promise.resolve(false);
      setData((prev) => {
        if (!prev) return prev;
        const next = fn(prev);
        result = persist(next);
        return next;
      });
      return result;
    },
    [persist],
  );

  const setName = useCallback(
    (name: string) => {
      update((prev) => ({ ...prev, name: name.trim() || null }));
    },
    [update],
  );

  const addAssignment = useCallback(
    (input: NewAssignmentInput): boolean => {
      const title = input.title.trim();
      if (!title || !input.dueDate) return false;
      update((prev) => {
        const { classId, classes } = resolveClassId(prev.classes, input.className);
        const newAssignment: Assignment = {
          id: uuidv4(),
          title,
          classId,
          dueDate: input.dueDate,
          type: input.type ?? 'other',
          done: false,
          createdAt: new Date().toISOString(),
        };
        return { ...prev, classes, assignments: [...prev.assignments, newAssignment] };
      });
      return true;
    },
    [update],
  );

  const updateAssignment = useCallback(
    (assignmentId: string, input: NewAssignmentInput): boolean => {
      const title = input.title.trim();
      if (!title || !input.dueDate) return false;
      update((prev) => {
        const { classId, classes } = resolveClassId(prev.classes, input.className);
        const assignments = prev.assignments.map((a) =>
          a.id === assignmentId
            ? { ...a, title, classId, dueDate: input.dueDate, type: input.type ?? a.type }
            : a,
        );
        return { ...prev, classes, assignments };
      });
      return true;
    },
    [update],
  );

  const deleteAssignment = useCallback(
    (assignmentId: string) => {
      update((prev) => ({
        ...prev,
        assignments: prev.assignments.filter((a) => a.id !== assignmentId),
      }));
    },
    [update],
  );

  const toggleComplete = useCallback(
    (assignmentId: string) => {
      update((prev) => ({
        ...prev,
        assignments: prev.assignments.map((a) =>
          a.id === assignmentId ? { ...a, done: !a.done } : a,
        ),
      }));
    },
    [update],
  );

  const addClass = useCallback(
    (name: string): boolean => {
      const trimmed = name.trim();
      if (!trimmed) return false;
      let created = false;
      update((prev) => {
        const exists = prev.classes.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
        if (exists) return prev;
        created = true;
        return { ...prev, classes: [...prev.classes, { id: uuidv4(), name: trimmed }] };
      });
      return created;
    },
    [update],
  );

  const renameClass = useCallback(
    (classId: string, name: string): boolean => {
      const trimmed = name.trim();
      if (!trimmed) return false;
      update((prev) => ({
        ...prev,
        classes: prev.classes.map((c) => (c.id === classId ? { ...c, name: trimmed } : c)),
      }));
      return true;
    },
    [update],
  );

  const deleteClass = useCallback(
    (classId: string) => {
      // Story 7: assignments referencing the deleted class fall back to
      // "General" (classId: null) rather than being deleted or left broken.
      update((prev) => ({
        ...prev,
        classes: prev.classes.filter((c) => c.id !== classId),
        assignments: prev.assignments.map((a) =>
          a.classId === classId ? { ...a, classId: null } : a,
        ),
      }));
    },
    [update],
  );

  // v5, story 7: same update()/persist() pattern as every other mutator —
  // no server-side change needed, `color` just rides along inside the
  // existing `classes` array on the next PUT.
  const setClassColor = useCallback(
    (classId: string, color: ClassColor | null) => {
      update((prev) => ({
        ...prev,
        classes: prev.classes.map((c) => (c.id === classId ? { ...c, color } : c)),
      }));
    },
    [update],
  );

  const dismissOnboarding = useCallback(() => {
    update((prev) => ({ ...prev, onboardingDismissed: true }));
  }, [update]);

  const dismissLinkNotice = useCallback(() => {
    update((prev) => ({ ...prev, linkNoticeDismissed: true }));
  }, [update]);

  // v4, story 12: same update()/persist() pattern as every other mutator —
  // rides the existing PUT, no new API endpoint (plan.md's "v4 revision note").
  // v5 debugging pass: returns whether the save actually succeeded, so
  // SettingsModal can tell her "enabled" from "the browser step worked but
  // saving it failed" instead of always showing success optimistically —
  // see plan.md's "v5 revision note" for why that distinction matters here
  // specifically (a silently-failed save here means notifications quietly
  // never fire, with nothing else to indicate why).
  const setPushSubscription = useCallback(
    (subscription: PushSubscriptionData | null): Promise<boolean> => {
      return update((prev) => ({ ...prev, pushSubscription: subscription }));
    },
    [update],
  );

  const setTimeZone = useCallback(
    (timeZone: string) => {
      update((prev) => ({ ...prev, timeZone }));
    },
    [update],
  );

  return {
    data,
    loading,
    setName,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    toggleComplete,
    addClass,
    renameClass,
    deleteClass,
    setClassColor,
    dismissOnboarding,
    dismissLinkNotice,
    setPushSubscription,
    setTimeZone,
  };
}
