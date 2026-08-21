// Traces to spec.md stories 1-9. Wires identity resolution, server-backed
// data, and all CRUD UI together.

import { useState } from 'react';
import './styles/tokens.css';
import './styles/app.css';
import { Sidebar } from './components/Sidebar';
import type { PageKey } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { UpNextStrip } from './components/UpNextStrip';
import { ViewToggle } from './components/ViewToggle';
import type { ViewMode } from './components/ViewToggle';
import { MonthGrid } from './components/MonthGrid';
import { AgendaList } from './components/AgendaList';
import { AssignmentModal } from './components/AssignmentModal';
import { OnboardingModal } from './components/OnboardingModal';
import { SettingsModal } from './components/SettingsModal';
import { LinkSaveBanner } from './components/LinkSaveBanner';
import { ClassesPage } from './components/ClassesPage';
import { StudyTimer } from './components/StudyTimer';
import { useIdentity } from './hooks/useIdentity';
import { useUserData } from './hooks/useUserData';
import type { Assignment } from './types/assignment';
import { privateUrl } from './lib/identity';

const TYPE_LEGEND = [
  { label: 'Exam', color: 'var(--danger)' },
  { label: 'Quiz', color: 'var(--warn)' },
  { label: 'Homework / Assignment', color: 'var(--peach)' },
  { label: 'Paper / Project', color: 'var(--accent)' },
  { label: 'Reading', color: 'var(--sky)' },
  { label: 'Problem Set', color: 'var(--mint)' },
  { label: 'Presentation', color: 'var(--safe)' },
  { label: 'Lab', color: 'var(--yellow)' },
  { label: 'Other', color: 'var(--ink-faint)' },
];

function App() {
  const { id } = useIdentity();
  const {
    data,
    loading,
    setName,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    toggleComplete,
    addClass,
    renameClass,
    deleteClass,
    dismissOnboarding,
    dismissLinkNotice,
  } = useUserData(id);

  const [page, setPage] = useState<PageKey>('calendar');
  const [view, setView] = useState<ViewMode>('month');
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [defaultDueDate, setDefaultDueDate] = useState<string | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  if (!id || loading || !data) {
    return (
      <div className="app-shell">
        <div className="loading-screen">🌱</div>
      </div>
    );
  }

  const isFreshIdentity =
    !data.name && data.classes.length === 0 && data.assignments.length === 0;
  const showOnboarding = isFreshIdentity && !data.onboardingDismissed;

  const openAddModal = (dateStr?: string) => {
    setEditingAssignment(null);
    setDefaultDueDate(dateStr);
    setAssignmentModalOpen(true);
  };

  const openEditModal = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setAssignmentModalOpen(true);
  };

  return (
    <div className="app-shell">
      <Sidebar page={page} onNavigate={setPage} />
      <div className="main">
        <Topbar
          name={data.name}
          onAddClick={() => openAddModal()}
          onAvatarClick={() => setSettingsOpen(true)}
        />

        {!data.linkNoticeDismissed && (
          <LinkSaveBanner url={privateUrl(id)} onDismiss={dismissLinkNotice} />
        )}

        {page === 'calendar' && (
          <>
            <UpNextStrip assignments={data.assignments} classes={data.classes} />

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
                  assignments={data.assignments}
                  month={month}
                  year={year}
                  onMonthChange={(m, y) => {
                    setMonth(m);
                    setYear(y);
                  }}
                  onSelectAssignment={openEditModal}
                  onAddOnDate={openAddModal}
                />
              ) : (
                <AgendaList
                  assignments={data.assignments}
                  classes={data.classes}
                  onToggleComplete={toggleComplete}
                  onSelectAssignment={openEditModal}
                />
              )}
            </div>
          </>
        )}

        {page === 'classes' && (
          <ClassesPage
            classes={data.classes}
            assignments={data.assignments}
            onAddClass={addClass}
            onRenameClass={renameClass}
            onDeleteClass={deleteClass}
          />
        )}

        {page === 'timer' && <StudyTimer />}
      </div>

      <AssignmentModal
        open={assignmentModalOpen}
        assignment={editingAssignment}
        classes={data.classes}
        defaultDueDate={defaultDueDate}
        onClose={() => setAssignmentModalOpen(false)}
        onSave={addAssignment}
        onUpdate={updateAssignment}
        onDelete={deleteAssignment}
      />

      <OnboardingModal
        open={showOnboarding}
        onSkip={dismissOnboarding}
        onSave={(name, classNames) => {
          if (name) setName(name);
          for (const c of classNames) addClass(c);
          dismissOnboarding();
        }}
      />

      <SettingsModal
        open={settingsOpen}
        name={data.name}
        privateUrl={privateUrl(id)}
        onClose={() => setSettingsOpen(false)}
        onSaveName={setName}
        onGoToClasses={() => setPage('classes')}
      />
    </div>
  );
}

export default App;
