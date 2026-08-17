import { describe, it, expect } from 'vitest';
import { getUrgencyBucket, getUrgencyLabel, getAgendaGroupLabel, daysBetween } from './urgency';

const TODAY = new Date(2026, 7, 17); // Aug 17, 2026

function offset(days: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

describe('getUrgencyBucket', () => {
  it('classifies an overdue date', () => {
    expect(getUrgencyBucket(offset(-2), TODAY)).toBe('overdue');
  });
  it('classifies today', () => {
    expect(getUrgencyBucket(offset(0), TODAY)).toBe('today');
  });
  it('classifies within 3 days as soon', () => {
    expect(getUrgencyBucket(offset(3), TODAY)).toBe('soon');
  });
  it('classifies beyond 3 days as later', () => {
    expect(getUrgencyBucket(offset(4), TODAY)).toBe('later');
  });
});

describe('getUrgencyLabel', () => {
  it('labels due today', () => {
    expect(getUrgencyLabel(offset(0), TODAY)).toBe('Due today');
  });
  it('labels due tomorrow', () => {
    expect(getUrgencyLabel(offset(1), TODAY)).toBe('Due tomorrow');
  });
  it('labels future days', () => {
    expect(getUrgencyLabel(offset(5), TODAY)).toBe('In 5 days');
  });
  it('labels overdue by 1 day', () => {
    expect(getUrgencyLabel(offset(-1), TODAY)).toBe('Overdue by 1 day');
  });
  it('labels overdue by multiple days', () => {
    expect(getUrgencyLabel(offset(-4), TODAY)).toBe('Overdue by 4 days');
  });
});

describe('getAgendaGroupLabel', () => {
  it('labels today group', () => {
    expect(getAgendaGroupLabel(offset(0), TODAY)).toMatch(/^Today ·/);
  });
  it('labels tomorrow group', () => {
    expect(getAgendaGroupLabel(offset(1), TODAY)).toMatch(/^Tomorrow ·/);
  });
  it('labels overdue group', () => {
    expect(getAgendaGroupLabel(offset(-2), TODAY)).toMatch(/^Overdue ·/);
  });
});

describe('daysBetween', () => {
  it('computes whole-day difference ignoring time-of-day', () => {
    const a = new Date(2026, 7, 17, 23, 59);
    const b = new Date(2026, 7, 18, 0, 1);
    expect(daysBetween(a, b)).toBe(1);
  });
});
