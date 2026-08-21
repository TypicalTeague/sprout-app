// Traces to spec.md story 7 (v3: links to the Classes tab, its one true
// home — see constitution.md's "Data safety" section for why the class
// CRUD logic itself didn't move, just this modal's UI) and story 9 (name
// editable later, not just at onboarding), plus the constitution's
// "Persistence & identity" private-link note.

import { useEffect, useState } from 'react';

interface SettingsModalProps {
  open: boolean;
  name: string | null;
  privateUrl: string;
  onClose: () => void;
  onSaveName: (name: string) => void;
  onGoToClasses: () => void;
}

export function SettingsModal({
  open,
  name,
  privateUrl,
  onClose,
  onSaveName,
  onGoToClasses,
}: SettingsModalProps) {
  const [nameInput, setNameInput] = useState(name ?? '');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) setNameInput(name ?? '');
  }, [open, name]);

  if (!open) return null;

  const handleClose = () => {
    if (nameInput.trim() !== (name ?? '')) onSaveName(nameInput);
    onClose();
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
          <p className="sub" style={{ margin: '0 0 8px' }}>
            Add, rename, or remove your classes from the Classes tab.
          </p>
          <button
            className="btn-ghost"
            onClick={() => {
              onGoToClasses();
              onClose();
            }}
          >
            Go to Classes →
          </button>
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
