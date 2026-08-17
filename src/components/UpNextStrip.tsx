// Traces to spec.md story 1: Up Next urgency strip.

import type { Assignment } from '../types/assignment';
import { ASSIGNMENT_TYPE_META } from '../types/assignment';
import type { ClassEntry } from '../types/userData';
import { getUrgencyBucket, getUrgencyLabel, formatShortDate } from '../lib/urgency';
import { resolveClassName } from '../lib/classes';
import { EmptyState } from './EmptyState';

interface UpNextStripProps {
  assignments: Assignment[];
  classes: ClassEntry[];
}

export function UpNextStrip({ assignments, classes }: UpNextStripProps) {
  const upcoming = assignments
    .filter((a) => !a.done)
    .sort((a, b) => (a.dueDate === b.dueDate ? a.createdAt.localeCompare(b.createdAt) : a.dueDate.localeCompare(b.dueDate)))
    .slice(0, 6);

  return (
    <div className="upnext">
      <div className="upnext-head">
        <span className="pulse-dot" />
        <h2>Up next</h2>
      </div>
      {upcoming.length === 0 ? (
        <EmptyState emoji="🌤️" message="Nothing urgent right now — enjoy the calm!" />
      ) : (
        <div className="upnext-scroll">
          {upcoming.map((a) => {
            const bucket = getUrgencyBucket(a.dueDate);
            const meta = ASSIGNMENT_TYPE_META[a.type];
            const urgencyClass =
              bucket === 'overdue' || bucket === 'today'
                ? 'due-today'
                : bucket === 'soon'
                  ? 'due-soon'
                  : 'due-later';
            return (
              <div className={`urgent-card ${urgencyClass}`} key={a.id}>
                <span className="urgent-badge">
                  {meta.icon} {getUrgencyLabel(a.dueDate)}
                </span>
                <h3>{a.title}</h3>
                <div className="meta">
                  🎓 {resolveClassName(classes, a.classId)} &nbsp;·&nbsp; {formatShortDate(a.dueDate)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
