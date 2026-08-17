// Traces to spec.md story 4: add an assignment in under 10 seconds.
// Inline validation only, no browser alert/confirm dialogs (constitution + story 4).

import { useState } from 'react';
import type { AssignmentType, NewAssignmentInput } from '../types/assignment';
import { ASSIGNMENT_TYPE_META } from '../types/assignment';

interface AddAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (input: NewAssignmentInput) => boolean;
}

const TYPE_ORDER: AssignmentType[] = ['exam', 'paper', 'reading', 'pset', 'other'];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AddAssignmentModal({ open, onClose, onSave }: AddAssignmentModalProps) {
  const [title, setTitle] = useState('');
  const [className, setClassName] = useState('');
  const [dueDate, setDueDate] = useState(todayISO());
  const [type, setType] = useState<AssignmentType>('exam');
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setTitle('');
    setClassName('');
    setDueDate(todayISO());
    setType('exam');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = () => {
    if (!title.trim() || !dueDate) {
      setError('Give it a title and a due date and you\'re all set.');
      return;
    }
    const ok = onSave({ title, className, dueDate, type });
    if (ok) {
      reset();
      onClose();
    } else {
      setError('Give it a title and a due date and you\'re all set.');
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
        <h3>Add an assignment</h3>
        <p className="sub">Takes 10 seconds. You can always edit it later.</p>

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
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            />
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
          <button className="btn-ghost" onClick={handleClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save assignment</button>
        </div>
      </div>
    </div>
  );
}
