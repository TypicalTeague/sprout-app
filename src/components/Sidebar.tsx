// Traces to spec.md stories 7 & 10 (v3: Classes and Study Timer are now
// real, routed pages) and the "out of scope" note (Tasks/Grades remain
// visual placeholders; Study Groups is not being built — see plan.md's
// "v3 revision note").

export type PageKey = 'calendar' | 'classes' | 'timer' | 'archive';

type NavEntry =
  | { key: PageKey; icon: string; label: string; disabled?: false }
  | { icon: string; label: string; disabled: true };

const NAV: NavEntry[] = [
  { key: 'calendar', icon: '📅', label: 'Calendar' },
  { key: 'classes', icon: '🎓', label: 'Classes' },
  { key: 'archive', icon: '🗄️', label: 'Archive' },
  { icon: '📊', label: 'Grades', disabled: true },
  { key: 'timer', icon: '⏱️', label: 'Study Timer' },
];

interface SidebarProps {
  page: PageKey;
  onNavigate: (page: PageKey) => void;
  archivedCount: number;
}

export function Sidebar({ page, onNavigate, archivedCount }: SidebarProps) {
  return (
    <div className="sidebar">
      <div className="brand">
        <span className="leaf">🌱</span> Sprout
      </div>
      <div className="nav">
        {NAV.map((item) =>
          item.disabled ? (
            <div className="nav-item disabled" key={item.label}>
              <span className="icon">{item.icon}</span> {item.label}
              <span className="soon-tag">SOON</span>
            </div>
          ) : (
            <div
              className={`nav-item ${page === item.key ? 'active' : ''}`}
              key={item.key}
              role="button"
              tabIndex={0}
              onClick={() => onNavigate(item.key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onNavigate(item.key);
                }
              }}
            >
              <span className="icon">{item.icon}</span> {item.label}
              {item.key === 'archive' && archivedCount > 0 && (
                <span className="nav-badge">{archivedCount}</span>
              )}
            </div>
          ),
        )}
      </div>
      <div className="sidebar-footer">
        <b>🌸 This is just the beginning</b>
        Calendar, classes, and a study timer are live — grades are sprouting next.
      </div>
    </div>
  );
}
