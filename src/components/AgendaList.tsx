// Traces to spec.md story 3 (agenda/list view) and story 5 (mark work as done).

import type { Assignment } from '../types/assignment';
import { ASSIGNMENT_TYPE_META } from '../types/assignment';
import type { ClassEntry } from '../types/userData';
import { getUrgencyBucket, getUrgencyLabel, getAgendaGroupLabel } from '../lib/urgency';
import { resolveClassName, classColorClassName } from '../lib/classes';
import { EmptyState } from './EmptyState';

interface AgendaListProps {
  assignments: Assignment[];
  classes: ClassEntry[];
  onToggleComplete: (id: string) => void;
  onSelectAssignment: (assignment: Assignment) => void;
  onOpenArchive: () => void;
}

export function AgendaList({
  assignments,
  classes,
  onToggleComplete,
  onSelectAssignment,
  onOpenArchive,
}: AgendaListProps) {
  // v5: completed assignments are archived — they disappear from the live
  // Agenda entirely (see plan.md's "v5 revision note"); the "Completed"
  // link below is the way back to them.
  const active = assignments.filter((a) => !a.done);
  const archivedCount = assignments.length - active.length;

  const archiveLink = archivedCount > 0 && (
    <button className="btn-ghost btn-small agenda-archive-link" onClick={onOpenArchive}>
      Completed ({archivedCount}) →
    </button>
  );

  if (active.length === 0) {
    return (
      <div className="agenda active">
        {archiveLink}
        <EmptyState emoji="🌤️" message="Nothing on the horizon — enjoy the calm!" />
      </div>
    );
  }

  const sorted = [...active].sort((a, b) =>
    a.dueDate === b.dueDate ? a.createdAt.localeCompare(b.createdAt) : a.dueDate.localeCompare(b.dueDate),
  );

  const groups = new Map<string, Assignment[]>();
  for (const a of sorted) {
    const list = groups.get(a.dueDate) ?? [];
    list.push(a);
    groups.set(a.dueDate, list);
  }

  return (
    <div className="agenda active">
      {archiveLink}
      {Array.from(groups.entries()).map(([dateStr, items]) => {
        const bucket = getUrgencyBucket(dateStr);
        const isTodayLabel = bucket === 'overdue' || bucket === 'today';
        return (
          <div className="agenda-group" key={dateStr}>
            <div className={`agenda-group-label ${isTodayLabel ? 'today-label' : ''}`}>
              {getAgendaGroupLabel(dateStr)}
            </div>
            <div className="agenda-list">
              {items.map((a) => {
                const meta = ASSIGNMENT_TYPE_META[a.type];
                return (
                  <div className="agenda-item" key={a.id}>
                    <div
                      className="agenda-check"
                      role="checkbox"
                      aria-checked={a.done}
                      aria-label={`Mark "${a.title}" ${a.done ? 'incomplete' : 'complete'}`}
                      tabIndex={0}
                      onClick={() => onToggleComplete(a.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onToggleComplete(a.id);
                        }
                      }}
                    />
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
                      <div className="a-meta">{resolveClassName(classes, a.classId)} · {meta.label}</div>
                    </div>
                    <div className={`a-time urgency-${bucket}`}>{getUrgencyLabel(a.dueDate)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
