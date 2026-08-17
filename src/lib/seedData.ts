// Traces to spec.md story 6: first-visit / empty-state example data so the
// demo never looks broken. Dates are generated relative to "today" so the
// seed data always looks current, however far in the future this runs.

import type { Assignment } from '../types/assignment';

function isoDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function isoNow(): string {
  return new Date().toISOString();
}

export function getSeedAssignments(): Assignment[] {
  return [
    {
      id: 'seed-1',
      title: 'Bio 201 Midterm',
      className: 'BIO 201',
      dueDate: isoDateOffset(0),
      type: 'exam',
      done: false,
      createdAt: isoNow(),
    },
    {
      id: 'seed-2',
      title: 'Reading response — Ch. 4',
      className: 'ENGL 110',
      dueDate: isoDateOffset(0),
      type: 'reading',
      done: false,
      createdAt: isoNow(),
    },
    {
      id: 'seed-3',
      title: 'Problem Set 3',
      className: 'MATH 152',
      dueDate: isoDateOffset(1),
      type: 'pset',
      done: false,
      createdAt: isoNow(),
    },
    {
      id: 'seed-4',
      title: 'Lab report draft',
      className: 'CHEM 101',
      dueDate: isoDateOffset(2),
      type: 'paper',
      done: false,
      createdAt: isoNow(),
    },
    {
      id: 'seed-5',
      title: 'Discussion post',
      className: 'PSYC 210',
      dueDate: isoDateOffset(3),
      type: 'other',
      done: false,
      createdAt: isoNow(),
    },
    {
      id: 'seed-6',
      title: 'History essay outline',
      className: 'HIST 130',
      dueDate: isoDateOffset(5),
      type: 'paper',
      done: false,
      createdAt: isoNow(),
    },
    {
      id: 'seed-7',
      title: 'Chapter 6 reading',
      className: 'ENGL 110',
      dueDate: isoDateOffset(7),
      type: 'reading',
      done: false,
      createdAt: isoNow(),
    },
    {
      id: 'seed-8',
      title: 'Quiz 2',
      className: 'MATH 152',
      dueDate: isoDateOffset(9),
      type: 'exam',
      done: false,
      createdAt: isoNow(),
    },
    {
      id: 'seed-9',
      title: 'Problem Set 4',
      className: 'MATH 152',
      dueDate: isoDateOffset(-3),
      type: 'pset',
      done: true,
      createdAt: isoNow(),
    },
  ];
}
