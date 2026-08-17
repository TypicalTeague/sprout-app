// Traces to spec.md stories 4 & 5 (add assignment, mark done) and
// plan.md's data-access boundary rule: components never touch storage.ts
// directly, only through this hook.

import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Assignment, NewAssignmentInput } from '../types/assignment';
import { loadAssignments, saveAssignments } from '../lib/storage';

export function useAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>(() => loadAssignments());

  useEffect(() => {
    saveAssignments(assignments);
  }, [assignments]);

  const addAssignment = useCallback((input: NewAssignmentInput): boolean => {
    const title = input.title.trim();
    const dueDate = input.dueDate;
    if (!title || !dueDate) {
      // Story 4 acceptance criteria: no entry created on missing required fields.
      return false;
    }
    const newAssignment: Assignment = {
      id: uuidv4(),
      title,
      className: input.className?.trim() || 'General',
      dueDate,
      type: input.type ?? 'other',
      done: false,
      createdAt: new Date().toISOString(),
    };
    setAssignments((prev) => [...prev, newAssignment]);
    return true;
  }, []);

  const toggleComplete = useCallback((id: string) => {
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, done: !a.done } : a)),
    );
  }, []);

  return { assignments, addAssignment, toggleComplete };
}
