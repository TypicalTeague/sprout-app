// Traces to spec.md story 4 (add, under 10 seconds) and story 8 (edit +
// delete). One form handles both: `assignment` present = edit mode.
// Inline validation only, no browser alert/confirm dialogs.

import { useEffect, useState } from 'react';
import type { Assignment, AssignmentType, NewAssignmentInput } from '../types/assignment';
import { ASSIGNMENT_TYPE_META } from '../types/assignment';
import type { ClassEntry } from '../types/userData';
import { resolveClassName } from '../lib/classes';
import { ConfirmButton } from './ConfirmButton';

interface AssignmentModalProps {
  open: boolean;
  assignment?: Assignment | null;
  classes: ClassEntry[];
  defaultDueDate?: string;
  onClose: () => void;
  onSave: (input: NewAssignmentInput) => boolean;
  onUpdate?: (id: string, input: NewAssignmentInput) => boolean;
  onDelete?: (id: string) => void;
}

const TYPE_ORDER: AssignmentType[] = [
  'exam',
  'quiz',
  'homework',
  'paper',
  'reading',
  'pset',
  'presentation',
  'lab',
  'other',
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AssignmentModal({
  open,
  assignment,
  classes,
  defaultDueDate,
  onClose,
  onSave,
  onUpdate,
  onDelete,
}: AssignmentModalProps) {
  const isEdit = Boolean(assignment);

  const [title, setTitle] = useState('');
  const [classNameInput, setClassNameInput] = useState('');
  const [dueDate, setDueDate] = useState(todayISO());
  const [type, setType] = useState<AssignmentType>('exam');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (assignment) {
      setTitle(assignment.title);
      setClassNameInput(resolveClassName(classes, assignment.classId) === 'General' ? '' : resolveClassName(classes, assignment.classId));
      setDueDate(assignment.dueDate);
      setType(assignment.type);
    } else {
      setTitle('');
      setClassNameInput('');
      setDueDate(defaultDueDate ?? todayISO());
      setType('exam');
    }
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, assignment?.id, defaultDueDate]);

  if (!open) return null;

  const handleClose = () => {
    onClose();
  };

  const handleSave = () => {
    if (!title.trim() || !dueDate) {
      setError('Give it a title and a due date and you\'re all set.');
      return;
    }
    const input: NewAssignmentInput = { title, className: classNameInput, dueDate, type };
    const ok = isEdit && assignment && onUpdate
      ? onUpdate(assignment.id, input)
      : onSave(input);
    if (ok) {
      onClose();
    } else {
      setError('Give it a title and a due date and you\'re all set.');
    }
  };

  const handleDelete = () => {
    if (assignment && onDelete) {
      onDelete(assignment.id);
      onClose();
    }
  };

  return (
    <div
      className="modal-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="modal">
        <h3>{isEdit ? 'Edit assignment' : 'Add an assignment'}</h3>
        <p className="sub">
          {isEdit ? 'Change anything, then save.' : "Takes 10 seconds. You can always edit it later."}
        </p>

        <div className="field">
          <label htmlFor="fTitle">What is it?</label>
          <input
            id="fTitle"
            type="text"
            placeholder="e.g. Bio 201 Midterm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="fClass">Class</label>
            <input
              id="fClass"
              type="text"
              placeholder="e.g. BIO 201"
              list="class-options"
              value={classNameInput}
              onChange={(e) => setClassNameInput(e.target.value)}
            />
            <datalist id="class-options">
              {classes.map((c) => (
                <option value={c.name} key={c.id} />
              ))}
            </datalist>
          </div>
          <div className="field">
            <label htmlFor="fDate">Due date</label>
            <input
              id="fDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label>Type</label>
          <div className="type-picker">
            {TYPE_ORDER.map((t) => (
              <div
                key={t}
                className={`type-opt ${type === t ? 'selected' : ''}`}
                onClick={() => setType(t)}
              >
                {ASSIGNMENT_TYPE_META[t].icon} {ASSIGNMENT_TYPE_META[t].label}
              </div>
            ))}
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          {isEdit && onDelete ? (
            <ConfirmButton
              className="btn-ghost btn-danger"
              label="Delete"
              confirmLabel="Confirm delete?"
              onConfirm={handleDelete}
            />
          ) : (
            <span />
          )}
          <div className="modal-actions-right">
            <button className="btn-ghost" onClick={handleClose}>Cancel</button>
            <button className="btn-primary" onClick={handleSave}>
              {isEdit ? 'Save changes' : 'Save assignment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
