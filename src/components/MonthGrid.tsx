// Traces to spec.md story 2: month grid with chips, today highlight, prev/next nav.

import type { Assignment } from '../types/assignment';
import { ASSIGNMENT_TYPE_META } from '../types/assignment';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface MonthGridProps {
  assignments: Assignment[];
  month: number; // 0-11
  year: number;
  onMonthChange: (month: number, year: number) => void;
}

function toISODate(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

export function MonthGrid({ assignments, month, year, onMonthChange }: MonthGridProps) {
  const today = new Date();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  type Cell = { day: number; other: boolean };
  const cells: Cell[] = [];
  for (let i = startOffset - 1; i >= 0; i--) cells.push({ day: daysInPrevMonth - i, other: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, other: false });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length, other: true });

  const goPrev = () => {
    const m = month - 1;
    if (m < 0) onMonthChange(11, year - 1);
    else onMonthChange(m, year);
  };
  const goNext = () => {
    const m = month + 1;
    if (m > 11) onMonthChange(0, year + 1);
    else onMonthChange(m, year);
  };

  return (
    <>
      <div className="month-nav">
        <button onClick={goPrev} aria-label="Previous month">‹</button>
        <h2>{MONTH_NAMES[month]} {year}</h2>
        <button onClick={goNext} aria-label="Next month">›</button>
      </div>
      <div className="calendar-grid">
        {DOW.map((d) => (
          <div className="dow" key={d}>{d}</div>
        ))}
        {cells.map((cell, idx) => {
          const isToday =
            !cell.other &&
            year === today.getFullYear() &&
            month === today.getMonth() &&
            cell.day === today.getDate();
          const dateStr = !cell.other ? toISODate(year, month, cell.day) : null;
          const dayAssignments = dateStr ? assignments.filter((a) => a.dueDate === dateStr) : [];
          const shown = dayAssignments.slice(0, 2);
          const extra = dayAssignments.length - shown.length;

          return (
            <div
              className={`day-cell ${cell.other ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
              key={idx}
            >
              <div className="day-num">{cell.day}</div>
              {shown.map((a) => (
                <div className={`day-chip chip-${a.type}`} key={a.id}>
                  {ASSIGNMENT_TYPE_META[a.type].icon} {a.title}
                </div>
              ))}
              {extra > 0 && <div className="day-more">+{extra} more</div>}
            </div>
          );
        })}
      </div>
    </>
  );
}
