// Traces to constitution.md "Persistence & identity": the private link is
// the real backup if a cookie/cache is ever cleared. Non-alarming,
// dismissible — a note, not a warning.

import { useState } from 'react';

interface LinkSaveBannerProps {
  url: string;
  onDismiss: () => void;
}

export function LinkSaveBanner({ url, onDismiss }: LinkSaveBannerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fail soft — link is still visible to copy manually
    }
  };

  return (
    <div className="link-banner">
      <span className="link-banner-icon">💾</span>
      <span className="link-banner-text">
        Save this link to keep your data safe — it'll bring everything back if you ever switch browsers or clear your cache.
      </span>
      <code className="link-banner-url">{url}</code>
      <button className="btn-ghost btn-small" onClick={handleCopy}>{copied ? 'Copied!' : 'Copy'}</button>
      <button className="link-banner-dismiss" aria-label="Dismiss" onClick={onDismiss}>×</button>
    </div>
  );
}
