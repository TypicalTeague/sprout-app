// Traces to spec.md stories 2, 4, 5, 8 and plan.md data model.

export type AssignmentType = 'exam' | 'paper' | 'reading' | 'pset' | 'other';

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
  paper: { label: 'Paper', icon: '📝' },
  reading: { label: 'Reading', icon: '📖' },
  pset: { label: 'Problem Set', icon: '➗' },
  other: { label: 'Other', icon: '✨' },
};
