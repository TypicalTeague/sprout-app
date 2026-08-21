// Traces to spec.md stories 2, 4, 5, 8 and plan.md data model.
// v3: widened purely additively — exam/paper/reading/pset/other keep their
// exact stored values/meaning; see constitution.md's "Data safety" section.

export type AssignmentType =
  | 'exam'
  | 'quiz'
  | 'homework'
  | 'paper'
  | 'reading'
  | 'pset'
  | 'presentation'
  | 'lab'
  | 'other';

export interface Assignment {
  id: string;
  title: string;
  classId: string | null; // null renders as "General"; references ClassEntry.id
  dueDate: string; // ISO date, YYYY-MM-DD
  type: AssignmentType;
  done: boolean;
  createdAt: string; // ISO timestamp, tie-break for stable sorts
}

export interface NewAssignmentInput {
  title: string;
  className?: string; // typed name; resolved to a classId (existing or newly-created) by useUserData
  dueDate: string;
  type?: AssignmentType;
}

export const ASSIGNMENT_TYPE_META: Record<
  AssignmentType,
  { label: string; icon: string }
> = {
  exam: { label: 'Exam', icon: '🧪' },
  quiz: { label: 'Quiz', icon: '❓' },
  homework: { label: 'Homework / Assignment', icon: '📚' },
  paper: { label: 'Paper / Project', icon: '📝' },
  reading: { label: 'Reading', icon: '📖' },
  pset: { label: 'Problem Set', icon: '➗' },
  presentation: { label: 'Presentation', icon: '🎤' },
  lab: { label: 'Lab', icon: '🔬' },
  other: { label: 'Other', icon: '✨' },
};
