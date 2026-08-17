// Traces to spec.md story 7 (manage classes any time) and story 9 (name
// editable later, not just at onboarding), plus the constitution's
// "Persistence & identity" private-link note.

import { useEffect, useState } from 'react';
import type { ClassEntry } from '../types/userData';
import { ConfirmButton } from './ConfirmButton';

interface SettingsModalProps {
  open: boolean;
  name: string | null;
  classes: ClassEntry[];
  privateUrl: string;
  onClose: () => void;
  onSaveName: (name: string) => void;
  onAddClass: (name: string) => void;
  onRenameClass: (id: string, name: string) => void;
  onDeleteClass: (id: string) => void;
}

export function SettingsModal({
  open,
  name,
  classes,
  privateUrl,
  onClose,
  onSaveName,
  onAddClass,
  onRenameClass,
  onDeleteClass,
}: SettingsModalProps) {
  const [nameInput, setNameInput] = useState(name ?? '');
  const [newClass, setNewClass] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) setNameInput(name ?? '');
  }, [open, name]);

  if (!open) return null;

  const handleClose = () => {
    if (nameInput.trim() !== (name ?? '')) onSaveName(nameInput);
    onClose();
  };

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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(privateUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context); the URL
      // is still visible to copy manually, so fail soft with no crash.
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
        <h3>Settings</h3>
        <p className="sub">Everything here is optional and editable any time.</p>

        <div className="field">
          <label htmlFor="sName">Your name</label>
          <input
            id="sName"
            type="text"
            placeholder="e.g. Julia"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Your classes</label>
          <div className="class-list">
            {classes.length === 0 && <p className="sub" style={{ margin: '4px 0' }}>No classes yet.</p>}
            {classes.map((c) => (
              <div className="class-row" key={c.id}>
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
                  <span className="class-name" onClick={() => startEditing(c)}>{c.name}</span>
                )}
                <ConfirmButton
                  className="btn-ghost btn-danger btn-small"
                  label="Delete"
                  confirmLabel="Confirm?"
                  onConfirm={() => onDeleteClass(c.id)}
                />
              </div>
            ))}
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
            <button className="btn-ghost" onClick={handleAddClass}>+ Add</button>
          </div>
        </div>

        <div className="field">
          <label>Your private link</label>
          <p className="sub" style={{ margin: '0 0 8px' }}>
            Save this somewhere — it's how your data comes back if your cookies/cache ever get cleared.
          </p>
          <div className="link-row">
            <input type="text" readOnly value={privateUrl} onClick={(e) => (e.target as HTMLInputElement).select()} />
            <button className="btn-ghost" onClick={handleCopy}>{copied ? 'Copied!' : 'Copy'}</button>
          </div>
        </div>

        <div className="modal-actions">
          <span />
          <div className="modal-actions-right">
            <button className="btn-primary" onClick={handleClose}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}
