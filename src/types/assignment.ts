// Traces to spec.md story 2-6 and plan.md data model.

export type AssignmentType = 'exam' | 'paper' | 'reading' | 'pset' | 'other';

export interface Assignment {
  id: string;
  title: string;
  className: string;
  dueDate: string; // ISO date, YYYY-MM-DD
  type: AssignmentType;
  done: boolean;
  createdAt: string; // ISO timestamp, tie-break for stable sorts
}

export interface NewAssignmentInput {
  title: string;
  className?: string;
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
