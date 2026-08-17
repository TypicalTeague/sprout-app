interface TopbarProps {
  name: string | null;
  onAddClick: () => void;
  onAvatarClick: () => void;
}

export function Topbar({ name, onAddClick, onAvatarClick }: TopbarProps) {
  const greeting = name ? `Hey ${name} 👋` : 'Welcome 🌱';
  const initial = name ? name.trim().charAt(0).toUpperCase() : '🙂';

  return (
    <div className="topbar">
      <div className="greeting">
        <h1>{greeting}</h1>
        <p>Here's what's growing on your plate this week.</p>
      </div>
      <div className="topbar-actions">
        <button className="add-btn" onClick={onAddClick}>
          ＋ Add assignment
        </button>
        <div
          className="avatar"
          role="button"
          tabIndex={0}
          aria-label="Open settings"
          onClick={onAvatarClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onAvatarClick();
            }
          }}
        >
          {initial}
        </div>
      </div>
    </div>
  );
}
