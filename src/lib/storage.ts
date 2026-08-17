// Traces to spec.md story 6 (data survives a refresh) and constitution.md
// error handling rule: a bad localStorage read/write must never crash the
// app — fail soft to an empty/seeded state and log a console warning.

import type { Assignment } from '../types/assignment';
import { getSeedAssignments } from './seedData';

const STORAGE_KEY = 'sprout.assignments.v1';

export function loadAssignments(): Assignment[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // First visit: seed with examples so the demo never looks empty/broken.
      const seeded = getSeedAssignments();
      saveAssignments(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('Stored assignments are not an array');
    }
    return parsed as Assignment[];
  } catch (err) {
    console.warn('[sprout] Failed to load assignments from localStorage, falling back to seed data.', err);
    return getSeedAssignments();
  }
}

export function saveAssignments(assignments: Assignment[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
  } catch (err) {
    console.warn('[sprout] Failed to save assignments to localStorage.', err);
  }
}
