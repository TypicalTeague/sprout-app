// Traces to spec.md "out of scope" note: Tasks/Classes/Grades/Study Groups
// exist as visual placeholders only (constitution: future-proofed shell).

const FUTURE_NAV = [
  { icon: '✅', label: 'Tasks' },
  { icon: '🎓', label: 'Classes' },
  { icon: '📊', label: 'Grades' },
  { icon: '👥', label: 'Study Groups' },
];

export function Sidebar() {
  return (
    <div className="sidebar">
      <div className="brand">
        <span className="leaf">🌱</span> Sprout
      </div>
      <div className="nav">
        <div className="nav-item active">
          <span className="icon">📅</span> Calendar
        </div>
        {FUTURE_NAV.map((item) => (
          <div className="nav-item disabled" key={item.label}>
            <span className="icon">{item.icon}</span> {item.label}
            <span className="soon-tag">SOON</span>
          </div>
        ))}
      </div>
      <div className="sidebar-footer">
        <b>🌸 This is just the beginning</b>
        Calendar is live first — tasks, classes and grades are sprouting next.
      </div>
    </div>
  );
}
