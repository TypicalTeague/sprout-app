import { describe, it, expect } from 'vitest';
import { resolveClassName, classColorClassName } from './classes';
import type { ClassEntry } from '../types/userData';

const CLASSES: ClassEntry[] = [
  { id: 'c1', name: 'BIO 201', color: 'mint' },
  { id: 'c2', name: 'CHEM 101' }, // legacy entry, no color key at all
  { id: 'c3', name: 'ART 100', color: null },
];

describe('resolveClassName', () => {
  it('returns "General" for a null classId', () => {
    expect(resolveClassName(CLASSES, null)).toBe('General');
  });

  it('returns "General" for an unknown classId', () => {
    expect(resolveClassName(CLASSES, 'does-not-exist')).toBe('General');
  });

  it('resolves a known classId to its name', () => {
    expect(resolveClassName(CLASSES, 'c1')).toBe('BIO 201');
  });
});

describe('classColorClassName', () => {
  it('returns the default class for a null classId (General)', () => {
    expect(classColorClassName(CLASSES, null)).toBe('class-color-default');
  });

  it('returns the default class for an unknown classId', () => {
    expect(classColorClassName(CLASSES, 'does-not-exist')).toBe('class-color-default');
  });

  it('returns the default class for a legacy class with no color key at all', () => {
    expect(classColorClassName(CLASSES, 'c2')).toBe('class-color-default');
  });

  it('returns the default class for a class with color explicitly null', () => {
    expect(classColorClassName(CLASSES, 'c3')).toBe('class-color-default');
  });

  it('resolves a class with a set color to its class-color-<color> class', () => {
    expect(classColorClassName(CLASSES, 'c1')).toBe('class-color-mint');
  });
});
