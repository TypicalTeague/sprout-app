// Traces to spec.md stories 1 & 3: encouraging empty states, per
// constitution.md tone principle ("nudge, don't nag").

interface EmptyStateProps {
  emoji: string;
  message: string;
}

export function EmptyState({ emoji, message }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="emoji">{emoji}</div>
      <p>{message}</p>
    </div>
  );
}
