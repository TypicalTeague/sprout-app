import type { ClassEntry } from '../types/userData';

export function resolveClassName(classes: ClassEntry[], classId: string | null): string {
  if (!classId) return 'General';
  return classes.find((c) => c.id === classId)?.name ?? 'General';
}

// v5 (spec.md story 7): the CSS class driving a class's color wherever it
// shows up — Month chips, Agenda/Archive icon backgrounds. Falls back to
// the neutral default for "General" (no class), an unknown classId, or a
// class that predates the color field / never had one set.
export function classColorClassName(classes: ClassEntry[], classId: string | null): string {
  const cls = classId ? classes.find((c) => c.id === classId) : undefined;
  return cls?.color ? `class-color-${cls.color}` : 'class-color-default';
}
