// Traces to spec.md story 7 (v3): the one home for class CRUD, reachable
// from the "Classes" sidebar tab. Reuses the same addClass/renameClass/
// deleteClass functions useUserData already exposed for the old Settings
// editor — only the UI's location moved, per constitution.md's "Data
// safety" section (no data-layer change here).

import { useState } from 'react';
import type { Assignment } from '../types/assignment';
import type { ClassColor, ClassEntry } from '../types/userData';
import { CLASS_COLOR_META, CLASS_COLOR_ORDER } from '../types/userData';
import { ConfirmButton } from './ConfirmButton';

interface ClassesPageProps {
  classes: ClassEntry[];
  assignments: Assignment[];
  onAddClass: (name: string) => boolean;
  onRenameClass: (id: string, name: string) => boolean;
  onDeleteClass: (id: string) => void;
  onSetClassColor: (id: string, color: ClassColor | null) => void;
}

export function ClassesPage({
  classes,
  assignments,
  onAddClass,
  onRenameClass,
  onDeleteClass,
  onSetClassColor,
}: ClassesPageProps) {
  const [newClass, setNewClass] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const countFor = (classId: string) => assignments.filter((a) => a.classId === classId).length;

  const handleAddClass = () => {
    if (!newClass.trim()) return;
    onAddClass(newClass);
    setNewClass('');
  };

  const startEditing = (c: ClassEntry) => {
    setEditingId(c.id);
    setEditingValue(c.name);
  };

  const commitEditing = () => {
    if (editingId && editingValue.trim()) {
      onRenameClass(editingId, editingValue);
    }
    setEditingId(null);
  };

  return (
    <div className="board classes-page">
      <div className="classes-head">
        <h2>Your classes</h2>
        <p className="sub">
          Add, rename, or remove your classes any time — changes apply everywhere they're tagged.
        </p>
      </div>

      <div className="class-list">
        {classes.length === 0 && (
          <p className="sub" style={{ margin: '4px 0' }}>
            No classes yet — add your first one below.
          </p>
        )}
        {classes.map((c) => {
          const count = countFor(c.id);
          return (
            <div className="class-row" key={c.id}>
              <div className="class-row-top">
                {editingId === c.id ? (
                  <input
                    type="text"
                    autoFocus
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={commitEditing}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEditing();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                ) : (
                  <span className="class-name" onClick={() => startEditing(c)}>
                    {c.name}
                  </span>
                )}
                <span className="class-count-badge">
                  {count} {count === 1 ? 'assignment' : 'assignments'}
                </span>
                <ConfirmButton
                  className="btn-ghost btn-danger btn-small"
                  label="Delete"
                  confirmLabel="Confirm?"
                  onConfirm={() => onDeleteClass(c.id)}
                />
              </div>
              <div className="color-swatch-row">
                {CLASS_COLOR_ORDER.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-swatch ${c.color === color ? 'selected' : ''}`}
                    style={{ background: CLASS_COLOR_META[color].swatch }}
                    aria-label={`Set ${c.name}'s color to ${CLASS_COLOR_META[color].label}`}
                    aria-pressed={c.color === color}
                    onClick={() => onSetClassColor(c.id, c.color === color ? null : color)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="class-add-row">
        <input
          type="text"
          placeholder="Add a class"
          value={newClass}
          onChange={(e) => setNewClass(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddClass();
          }}
        />
        <button className="btn-ghost" onClick={handleAddClass}>
          + Add
        </button>
      </div>
    </div>
  );
}
