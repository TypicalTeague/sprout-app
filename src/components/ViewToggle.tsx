export type ViewMode = 'month' | 'agenda';

interface ViewToggleProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="view-toggle">
      <button className={view === 'month' ? 'active' : ''} onClick={() => onChange('month')}>
        Month
      </button>
      <button className={view === 'agenda' ? 'active' : ''} onClick={() => onChange('agenda')}>
        Agenda
      </button>
    </div>
  );
}
