// Traces to spec.md story 9: fully optional, skippable setup. Shown only
// on a genuinely fresh identity — never forced, always one click from an
// empty usable calendar.

import { useState } from 'react';

interface OnboardingModalProps {
  open: boolean;
  onSave: (name: string, classNames: string[]) => void;
  onSkip: () => void;
}

export function OnboardingModal({ open, onSave, onSkip }: OnboardingModalProps) {
  const [name, setName] = useState('');
  const [classesInput, setClassesInput] = useState('');

  if (!open) return null;

  const handleSave = () => {
    const classNames = classesInput
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    onSave(name.trim(), classNames);
  };

  return (
    <div className="modal-overlay open">
      <div className="modal">
        <h3>Welcome to Sprout 🌱</h3>
        <p className="sub">
          Everything here is optional — skip this and jump straight in if you'd rather.
        </p>

        <div className="field">
          <label htmlFor="oName">What should we call you? (optional)</label>
          <input
            id="oName"
            type="text"
            placeholder="e.g. Julia"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="oClasses">Your classes, comma separated (optional)</label>
          <input
            id="oClasses"
            type="text"
            placeholder="e.g. BIO 201, ENGL 110, MATH 152"
            value={classesInput}
            onChange={(e) => setClassesInput(e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <span />
          <div className="modal-actions-right">
            <button className="btn-ghost" onClick={onSkip}>Skip for now</button>
            <button className="btn-primary" onClick={handleSave}>Save &amp; continue</button>
          </div>
        </div>
      </div>
    </div>
  );
}
