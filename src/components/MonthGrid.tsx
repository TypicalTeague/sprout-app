// Traces to spec.md story 2: month grid with chips, today highlight, and
// (v4) faster navigation — a month/year picker, a Today button, and
// swipe-left/right on touch devices.

import { useRef, useState } from 'react';
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
  onSelectAssignment: (assignment: Assignment) => void;
  onAddOnDate: (dateStr: string) => void;
}

function toISODate(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

const SWIPE_THRESHOLD_PX = 50;

export function MonthGrid({ assignments, month, year, onMonthChange, onSelectAssignment, onAddOnDate }: MonthGridProps) {
  const today = new Date();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const [pickerOpen, setPickerOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

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
  const goToday = () => {
    const now = new Date();
    onMonthChange(now.getMonth(), now.getFullYear());
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const dx = endX - touchStartX.current;
    touchStartX.current = null;
    if (dx > SWIPE_THRESHOLD_PX) goPrev();
    else if (dx < -SWIPE_THRESHOLD_PX) goNext();
  };

  return (
    <>
      <div className="month-nav">
        <button className="month-nav-arrow" onClick={goPrev} aria-label="Previous month">‹</button>
        <div className="month-label-wrap">
          <button
            className="month-label-btn"
            onClick={() => setPickerOpen((o) => !o)}
            aria-expanded={pickerOpen}
          >
            {MONTH_NAMES[month]} {year} <span className="caret">▾</span>
          </button>
          {pickerOpen && (
            <>
              <div className="month-picker-backdrop" onClick={() => setPickerOpen(false)} />
              <div
                className="month-picker-popover"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setPickerOpen(false);
                }}
              >
                <select
                  aria-label="Month"
                  value={month}
                  onChange={(e) => {
                    onMonthChange(Number(e.target.value), year);
                    setPickerOpen(false);
                  }}
                >
                  {MONTH_NAMES.map((m, i) => (
                    <option value={i} key={m}>{m}</option>
                  ))}
                </select>
                <input
                  aria-label="Year"
                  type="number"
                  value={year}
                  onChange={(e) => {
                    const y = Number(e.target.value);
                    if (Number.isFinite(y) && y >= 1000 && y <= 9999) {
                      onMonthChange(month, y);
                    }
                  }}
                />
              </div>
            </>
          )}
        </div>
        <button className="btn-ghost btn-small today-btn" onClick={goToday}>Today</button>
        <button className="month-nav-arrow" onClick={goNext} aria-label="Next month">›</button>
      </div>
      <div className="calendar-grid" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
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
              role={dateStr ? 'button' : undefined}
              tabIndex={dateStr ? 0 : undefined}
              aria-label={dateStr ? `Add an assignment on ${dateStr}` : undefined}
              onClick={dateStr ? () => onAddOnDate(dateStr) : undefined}
              onKeyDown={
                dateStr
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onAddOnDate(dateStr);
                      }
                    }
                  : undefined
              }
            >
              <div className="day-num">{cell.day}</div>
              {shown.map((a) => (
                <div
                  className={`day-chip chip-${a.type}`}
                  key={a.id}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectAssignment(a);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      onSelectAssignment(a);
                    }
                  }}
                >
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
