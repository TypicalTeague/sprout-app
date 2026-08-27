// Traces to spec.md story 13 (v5, new): everything she's finished, in one
// reachable place. Reuses `Assignment.done` as the archive signal — no new
// stored field, since "archived" and "done" are the same moment in this
// app (see plan.md's "v5 revision note"). Restoring an item is exactly
// un-completing it, via the same `toggleComplete` mutator the Agenda
// checkbox already uses.

import type { Assignment } from '../types/assignment';
import { ASSIGNMENT_TYPE_META } from '../types/assignment';
import type { ClassEntry } from '../types/userData';
import { formatShortDate } from '../lib/urgency';
import { resolveClassName, classColorClassName } from '../lib/classes';
import { EmptyState } from './EmptyState';

interface ArchivePageProps {
  assignments: Assignment[]; // full list — this component does its own `a.done` filtering
  classes: ClassEntry[];
  onRestore: (id: string) => void;
  onSelectAssignment: (assignment: Assignment) => void;
}

export function ArchivePage({ assignments, classes, onRestore, onSelectAssignment }: ArchivePageProps) {
  const archived = assignments.filter((a) => a.done);

  if (archived.length === 0) {
    return (
      <div className="board archive-page">
        <div className="archive-head">
          <h2>Archive</h2>
          <p className="sub">Everything you finish lands here.</p>
        </div>
        <EmptyState emoji="🌼" message="Nothing archived yet — finish something and it'll show up here." />
      </div>
    );
  }

  const sorted = [...archived].sort((a, b) =>
    a.dueDate === b.dueDate ? b.createdAt.localeCompare(a.createdAt) : b.dueDate.localeCompare(a.dueDate),
  );

  const groups = new Map<string, Assignment[]>();
  for (const a of sorted) {
    const list = groups.get(a.dueDate) ?? [];
    list.push(a);
    groups.set(a.dueDate, list);
  }

  return (
    <div className="board archive-page">
      <div className="archive-head">
        <h2>Archive</h2>
        <p className="sub">
          Everything you've finished, grouped by due date. Restore anything to bring it back to Agenda and Month.
        </p>
      </div>
      <div className="agenda active">
        {Array.from(groups.entries()).map(([dateStr, items]) => (
          <div className="agenda-group" key={dateStr}>
            <div className="agenda-group-label">{formatShortDate(dateStr)}</div>
            <div className="agenda-list">
              {items.map((a) => {
                const meta = ASSIGNMENT_TYPE_META[a.type];
                return (
                  <div className="agenda-item" key={a.id}>
                    <div className={`a-icon ${classColorClassName(classes, a.classId)}`}>{meta.icon}</div>
                    <div
                      className="a-body"
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectAssignment(a)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectAssignment(a);
                        }
                      }}
                    >
                      <div className="a-title">{a.title}</div>
                      <div className="a-meta">
                        {resolveClassName(classes, a.classId)} · {meta.label}
                      </div>
                    </div>
                    <button className="btn-ghost btn-small" onClick={() => onRestore(a.id)}>
                      ↺ Restore
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
