import type { ClassEntry } from '../types/userData';

export function resolveClassName(classes: ClassEntry[], classId: string | null): string {
  if (!classId) return 'General';
  return classes.find((c) => c.id === classId)?.name ?? 'General';
}
