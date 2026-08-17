import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadAssignments, saveAssignments } from './storage';
import type { Assignment } from '../types/assignment';

const sample: Assignment[] = [
  {
    id: 'a1',
    title: 'Test assignment',
    className: 'TEST 101',
    dueDate: '2026-08-20',
    type: 'other',
    done: false,
    createdAt: new Date().toISOString(),
  },
];

beforeEach(() => {
  window.localStorage.clear();
});

describe('storage', () => {
  it('seeds example data on first load when nothing is stored', () => {
    const result = loadAssignments();
    expect(result.length).toBeGreaterThan(0);
  });

  it('saves and reloads assignments (persists across refresh)', () => {
    saveAssignments(sample);
    const result = loadAssignments();
    expect(result).toEqual(sample);
  });

  it('falls back to seed data without throwing if storage is corrupted', () => {
    window.localStorage.setItem('sprout.assignments.v1', 'not valid json {{{');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => loadAssignments()).not.toThrow();
    const result = loadAssignments();
    expect(result.length).toBeGreaterThan(0);
    warnSpy.mockRestore();
  });
});
