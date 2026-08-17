interface TopbarProps {
  onAddClick: () => void;
}

export function Topbar({ onAddClick }: TopbarProps) {
  return (
    <div className="topbar">
      <div className="greeting">
        <h1>Hey Julia 👋</h1>
        <p>Here's what's growing on your plate this week.</p>
      </div>
      <div className="topbar-actions">
        <button className="add-btn" onClick={onAddClick}>
          ＋ Add assignment
        </button>
        <div className="avatar">J</div>
      </div>
    </div>
  );
}
