// Traces to spec.md story 3 (agenda/list view) and story 5 (mark work as done).

import type { Assignment } from '../types/assignment';
import { ASSIGNMENT_TYPE_META } from '../types/assignment';
import { getUrgencyBucket, getUrgencyLabel, getAgendaGroupLabel } from '../lib/urgency';
import { EmptyState } from './EmptyState';

interface AgendaListProps {
  assignments: Assignment[];
  onToggleComplete: (id: string) => void;
}

export function AgendaList({ assignments, onToggleComplete }: AgendaListProps) {
  if (assignments.length === 0) {
    return <EmptyState emoji="🌤️" message="Nothing on the horizon — enjoy the calm!" />;
  }

  const sorted = [...assignments].sort((a, b) =>
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
                  <div className={`agenda-item ${a.done ? 'done' : ''}`} key={a.id}>
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
                    <div className={`a-icon type-bg-${a.type}`}>{meta.icon}</div>
                    <div className="a-body">
                      <div className="a-title">{a.title}</div>
                      <div className="a-meta">{a.className} · {meta.label}</div>
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
