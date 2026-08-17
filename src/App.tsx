// Traces to spec.md stories 1-6, wiring all components together.
// T11: Sidebar, Topbar, view toggle switching Month/Agenda without reload,
// modal open/save wiring.

import { useState } from 'react';
import './styles/tokens.css';
import './styles/app.css';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { UpNextStrip } from './components/UpNextStrip';
import { ViewToggle } from './components/ViewToggle';
import type { ViewMode } from './components/ViewToggle';
import { MonthGrid } from './components/MonthGrid';
import { AgendaList } from './components/AgendaList';
import { AddAssignmentModal } from './components/AddAssignmentModal';
import { useAssignments } from './hooks/useAssignments';

const TYPE_LEGEND = [
  { label: 'Exam', color: 'var(--danger)' },
  { label: 'Paper / Project', color: 'var(--accent)' },
  { label: 'Reading', color: 'var(--sky)' },
  { label: 'Problem Set', color: 'var(--mint)' },
  { label: 'Other', color: 'var(--yellow)' },
];

function App() {
  const { assignments, addAssignment, toggleComplete } = useAssignments();
  const [view, setView] = useState<ViewMode>('month');
  const [modalOpen, setModalOpen] = useState(false);
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Topbar onAddClick={() => setModalOpen(true)} />
        <UpNextStrip assignments={assignments} />

        <div className="board">
          <div className="board-toolbar">
            <ViewToggle view={view} onChange={setView} />
          </div>

          {view === 'month' && (
            <div className="legend">
              {TYPE_LEGEND.map((item) => (
                <div className="legend-item" key={item.label}>
                  <span className="legend-dot" style={{ background: item.color }} />
                  {item.label}
                </div>
              ))}
            </div>
          )}

          {view === 'month' ? (
            <MonthGrid
              assignments={assignments}
              month={month}
              year={year}
              onMonthChange={(m, y) => {
                setMonth(m);
                setYear(y);
              }}
            />
          ) : (
            <AgendaList assignments={assignments} onToggleComplete={toggleComplete} />
          )}
        </div>
      </div>

      <AddAssignmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={addAssignment}
      />
    </div>
  );
}

export default App;
