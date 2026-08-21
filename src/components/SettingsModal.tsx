// Traces to spec.md story 7 (v3: links to the Classes tab, its one true
// home — see constitution.md's "Data safety" section for why the class
// CRUD logic itself didn't move, just this modal's UI), story 9 (name
// editable later, not just at onboarding), and story 12 (v4: optional push
// notification enable/disable), plus the constitution's "Persistence &
// identity" private-link note.

import { useState, useEffect } from 'react';
import type { PushSubscriptionData } from '../types/push';
import { subscribeToPush, unsubscribeFromPush } from '../lib/push';

interface SettingsModalProps {
  open: boolean;
  name: string | null;
  privateUrl: string;
  pushSubscribed: boolean;
  onClose: () => void;
  onSaveName: (name: string) => void;
  onGoToClasses: () => void;
  onSetPushSubscription: (subscription: PushSubscriptionData | null) => void;
}

type NotifStatus = 'idle' | 'working' | 'ios-hint' | 'denied' | 'unsupported' | 'error';

export function SettingsModal({
  open,
  name,
  privateUrl,
  pushSubscribed,
  onClose,
  onSaveName,
  onGoToClasses,
  onSetPushSubscription,
}: SettingsModalProps) {
  const [nameInput, setNameInput] = useState(name ?? '');
  const [copied, setCopied] = useState(false);
  const [notifStatus, setNotifStatus] = useState<NotifStatus>('idle');

  useEffect(() => {
    if (open) setNameInput(name ?? '');
  }, [open, name]);

  if (!open) return null;

  const handleClose = () => {
    if (nameInput.trim() !== (name ?? '')) onSaveName(nameInput);
    onClose();
  };

  const handleEnableNotifications = async () => {
    setNotifStatus('working');
    const result = await subscribeToPush();
    if (result.ok) {
      onSetPushSubscription(result.subscription);
      setNotifStatus('idle');
    } else if (result.reason === 'ios-not-installed') {
      setNotifStatus('ios-hint');
    } else if (result.reason === 'permission-denied') {
      setNotifStatus('denied');
    } else if (result.reason === 'unsupported') {
      setNotifStatus('unsupported');
    } else {
      setNotifStatus('error');
    }
  };

  const handleDisableNotifications = async () => {
    await unsubscribeFromPush();
    onSetPushSubscription(null);
    setNotifStatus('idle');
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
          <label>Reminders</label>
          <p className="sub" style={{ margin: '0 0 8px' }}>
            Get a push notification the evening before something's due, and again the morning it's due.
          </p>
          {pushSubscribed ? (
            <button className="btn-ghost" onClick={handleDisableNotifications}>
              Turn off notifications
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={handleEnableNotifications}
              disabled={notifStatus === 'working'}
            >
              {notifStatus === 'working' ? 'Enabling…' : 'Enable notifications'}
            </button>
          )}
          {notifStatus === 'ios-hint' && (
            <p className="notif-hint">
              On iPhone, add Sprout to your Home Screen first (Share → Add to Home Screen), then come back here to turn on notifications.
            </p>
          )}
          {notifStatus === 'denied' && (
            <p className="form-error">
              Notifications are blocked — check your phone/browser settings to allow them for Sprout.
            </p>
          )}
          {notifStatus === 'unsupported' && (
            <p className="form-error">This browser doesn't support push notifications.</p>
          )}
          {notifStatus === 'error' && (
            <p className="form-error">Something went wrong enabling notifications — try again in a bit.</p>
          )}
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
